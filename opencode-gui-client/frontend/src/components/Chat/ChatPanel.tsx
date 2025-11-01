import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { GetMessages, SendMessage, PolishText } from '../../../wailsjs/go/main/App';
import { models } from '../../../wailsjs/go/models';
// Wails の自動生成型には Event や TextPart は含まれないため、フロント側でイベント型を定義します。
type ServerEvent = {
    sessionID: string;
    messageID: string;
    partID: string;
    data: any; // { type: 'text'; text: string } | 他のパート
};
import { EventsOn } from '../../../wailsjs/runtime';

interface ChatPanelProps {
    sessionId: string | null;
    onModelUpdate: (model: string | null) => void;
    selectedModel: { providerId: string; modelId: string } | null;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ sessionId, onModelUpdate, selectedModel }) => {
    const [messages, setMessages] = useState<models.MessageWithParts[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isPolishing, setIsPolishing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showScrollButton, setShowScrollButton] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const userScrolledUp = useRef(false);

    useEffect(() => {
        if (sessionId) {
            const unsubscribe = EventsOn('server-event', (event: ServerEvent) => {
                if (event.sessionID !== sessionId) return;

                setMessages(prevMessages => {
                    const existingMsgIndex = prevMessages.findIndex(m => m.info.id === event.messageID);

                    if (existingMsgIndex !== -1) {
                        // Update existing message
                        const updatedMessages = [...prevMessages];
                        const existingMessage = updatedMessages[existingMsgIndex];
                        
                        const partIndex = existingMessage.parts.findIndex(p => p.id === event.partID);
                        if (partIndex !== -1) {
                            // Update existing part
                            const updatedParts = [...existingMessage.parts];
                            const existingPart = updatedParts[partIndex];
                            if (existingPart.type === 'text' && event.data?.type === 'text') {
                                existingPart.text += String(event.data?.text ?? '');
                            }
                            updatedMessages[existingMsgIndex] = { ...existingMessage, parts: updatedParts };
                        } else {
                            // Add new part
                            const newPart = {
                                id: event.partID,
                                type: 'text' as const,
                                text: String(event.data?.text ?? ''),
                            };
                            updatedMessages[existingMsgIndex] = { ...existingMessage, parts: [...existingMessage.parts, newPart] };
                        }
                        return updatedMessages;
                    } else {
                        // Add new message
                        const newPart = {
                            id: event.partID,
                            type: 'text' as const,
                            text: String(event.data?.text ?? ''),
                        };
                        const newMessage = {
                            info: {
                                id: event.messageID,
                                sessionID: event.sessionID,
                                role: 'assistant',
                                time: { created: Date.now() / 1000 },
                            },
                            parts: [newPart],
                        };
                        return [...prevMessages, newMessage];
                    }
                });
            });

            return () => {
                unsubscribe();
            };
        }
    }, [sessionId]);

    useEffect(() => {
        if (messages.length > 0) {
            const lastAssistantMessage = [...messages].reverse().find(m => m.info.role === 'assistant');
            if (lastAssistantMessage && lastAssistantMessage.info.modelID) {
                onModelUpdate(lastAssistantMessage.info.modelID);
            }
        }
    }, [messages, onModelUpdate]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        userScrolledUp.current = false;
    };

    useEffect(() => {
        if (!userScrolledUp.current) {
            scrollToBottom();
        }
    }, [messages]);

    useEffect(() => {
        if (sessionId) {
            setIsLoading(true);
            setError(null);
            userScrolledUp.current = false; // Reset scroll lock on session change
            GetMessages(sessionId)
                .then(setMessages)
                .catch(err => setError(`Failed to load messages: ${err}`))
                .finally(() => setIsLoading(false));
        } else {
            setMessages([]);
        }
    }, [sessionId]);

    const handleScroll = () => {
        const container = messagesContainerRef.current;
        if (container) {
            const isScrolledToBottom = container.scrollHeight - container.clientHeight <= container.scrollTop + 1;
            if (isScrolledToBottom) {
                userScrolledUp.current = false;
                setShowScrollButton(false);
            } else {
                userScrolledUp.current = true;
                setShowScrollButton(true);
            }
        }
    };

    const handleSendMessage = () => {
        if (!sessionId || !inputValue.trim()) return;
        userScrolledUp.current = false; // Auto-scroll when sending a new message

        const userMessage: models.MessageWithParts = {
            info: {
                id: `temp-id-${Date.now()}`,
                sessionID: sessionId,
                role: 'user',
                time: { created: Date.now() / 1000 },
            },
            parts: [{
                id: `temp-part-id-${Date.now()}`,
                type: 'text',
                text: inputValue,
            }],
        };

        setMessages(prev => [...prev, userMessage]);
        const currentInputValue = inputValue;
        setInputValue('');

        const textPart = models.TextInputPart.createFrom({
            type: "text",
            text: currentInputValue,
        });

        const chatInput = models.ChatInput.createFrom({
            parts: [textPart],
            model: selectedModel ? models.ModelSelection.createFrom({
                providerID: selectedModel.providerId,
                modelID: selectedModel.modelId,
            }) : undefined,
        });

        SendMessage(sessionId, chatInput)
            .then(assistantMessage => {
                setMessages(prev => {
                    return [...prev.filter(m => m.info.id !== userMessage.info.id), userMessage, assistantMessage];
                });
            })
            .catch(err => {
                setError(`Failed to send message: ${err}`);
                setMessages(prev => prev.filter(m => m.info.id !== userMessage.info.id));
            });
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handlePolishText = async () => {
        if (!inputValue.trim()) {
            setError('Please enter some text to polish');
            return;
        }

        setIsPolishing(true);
        setError(null);

        try {
            const polishedText = await PolishText(inputValue);
            setInputValue(polishedText);
        } catch (err) {
            setError(`Failed to polish text: ${err}`);
        } finally {
            setIsPolishing(false);
        }
    };

    if (!sessionId) {
        return <div className="chat-panel centered">Select a session to start chatting</div>;
    }

    if (isLoading && messages.length === 0) {
        return <div className="chat-panel centered">Loading messages...</div>;
    }

    return (
        <div className="chat-panel">
            {error && <div className="error-message">{error}</div>}
            <div className="messages-container" ref={messagesContainerRef} onScroll={handleScroll}>
                {messages.map((msg, index) => (
                    <div key={index} className={`message ${msg.info.role}`}>
                        {msg.parts
                            .filter((part): part is { type: 'text'; text: string } => 
                                part && 
                                typeof part === 'object' && 
                                part.type === 'text' && 
                                typeof part.text === 'string'
                            )
                            .map((part, pIndex) => (
                                <ReactMarkdown key={pIndex} remarkPlugins={[remarkGfm]}>
                                    {part.text}
                                </ReactMarkdown>
                            ))}
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            {showScrollButton && (
                <button className="scroll-to-bottom-btn" onClick={scrollToBottom}>
                    ↓
                </button>
            )}
            <div className="input-area">
                <textarea
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your message... (Ctrl+Enter to send)"
                    disabled={isLoading || isPolishing}
                />
                <div className="input-actions">
                    <button 
                        className="polish-button" 
                        onClick={handlePolishText}
                        disabled={isLoading || isPolishing || !inputValue.trim()}
                        title="Polish text using LLM"
                    >
                        {isPolishing ? 'Polishing...' : 'LLM Polish'}
                    </button>
                    <button 
                        className="send-button" 
                        onClick={handleSendMessage}
                        disabled={isLoading || isPolishing || !inputValue.trim()}
                    >
                        Send
                    </button>
                </div>
            </div>
        </div>
    );
};
