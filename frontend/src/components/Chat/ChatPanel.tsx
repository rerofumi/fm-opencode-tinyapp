import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { GetMessages, SendMessage, PolishText } from '../../../wailsjs/go/main/App';
import { models } from '../../../wailsjs/go/models';
import { models as typeModels } from '../../types';
// Wails の自動生成型には Event や TextPart は含まれないため、フロント側でイベント型を定義します。
// API仕様に基づいた Event 型定義
type MessagePartUpdatedEvent = {
    type: 'message.part.updated';
    properties: {
        part: any; // TextPart | ReasoningPart | ToolPart など
        delta?: string; // テキストの差分
    };
};

type MessageUpdatedEvent = {
    type: 'message.updated';
    properties: {
        info: any; // Message
    };
};

type SessionUpdatedEvent = {
    type: 'session.updated';
    properties: {
        info: any; // Session
    };
};

type ServerEvent = MessagePartUpdatedEvent | MessageUpdatedEvent | SessionUpdatedEvent;
import { EventsOn } from '../../../wailsjs/runtime';

type PilotStatus = 'idle' | 'pending' | 'running';

interface ChatPanelProps {
    sessionId: string | null;
    onModelUpdate: (model: string | null) => void;
    selectedModel: { providerId: string; modelId: string } | null;
    selectedAgent: string | null;
    onPilotStatusChange?: (status: PilotStatus) => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ sessionId, onModelUpdate, selectedModel, selectedAgent, onPilotStatusChange }) => {
    const [messages, setMessages] = useState<models.MessageWithParts[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isPolishing, setIsPolishing] = useState(false);
    const [isWaiting, setIsWaiting] = useState(false);
    const isWaitingRef = useRef(false);
    const [error, setError] = useState<string | null>(null);
    const [showScrollButton, setShowScrollButton] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const userScrolledUp = useRef(false);
    const waitingTimeoutRef = useRef<number | null>(null);

    // Poll OpenCode state to recover from missed SSE events / silent periods.
    // Only transitions to idle when the server reports completion.
    const POLL_INTERVAL_MS = 10_000;
    const pilotStatusRef = useRef<PilotStatus>('idle');
    const lastRelevantEventAtRef = useRef<number>(Date.now());
    const activeAssistantMessageIDRef = useRef<string | null>(null);
    const activeRequestStartedAtRef = useRef<number | null>(null); // seconds (approx)

    const emitPilotStatus = (status: PilotStatus) => {
        pilotStatusRef.current = status;
        onPilotStatusChange?.(status);
    };

    const syncPilotFromMessages = (msgs: any[]) => {
        const trackedID = activeAssistantMessageIDRef.current;
        const activeStartedAt = activeRequestStartedAtRef.current;

        let assistantMsg: any | null = null;

        // 1) If we have a tracked assistant message ID (best), use it.
        if (trackedID) {
            assistantMsg = msgs.find(m => (m as any)?.info?.id === trackedID && (m as any)?.info?.role === 'assistant') || null;
        }

        // 2) If we're in pending and we have an active request start time, only consider
        // assistant messages created after the send time. This prevents mistakenly
        // flipping to idle based on an older, completed assistant message.
        if (!assistantMsg && pilotStatusRef.current === 'pending' && typeof activeStartedAt === 'number') {
            const cutoff = activeStartedAt - 1; // allow slight clock skew
            assistantMsg =
                [...msgs]
                    .reverse()
                    .find(m => (m as any)?.info?.role === 'assistant' && ((m as any)?.info?.time?.created ?? 0) >= cutoff) || null;

            // If we still can't see an assistant message for this request, keep pending.
            if (!assistantMsg) {
                return;
            }
        }

        // 3) Fallback: latest assistant message in the session.
        if (!assistantMsg) {
            assistantMsg = [...msgs].reverse().find(m => (m as any)?.info?.role === 'assistant') || null;
        }

        if (!assistantMsg) {
            emitPilotStatus('idle');
            activeAssistantMessageIDRef.current = null;
            activeRequestStartedAtRef.current = null;
            return;
        }

        // We can observe the assistant message for this request -> clear any "waiting" warning.
        setError(null);

        const completed = (assistantMsg as any)?.info?.time?.completed;
        emitPilotStatus(completed ? 'idle' : 'running');

        // Once we know which assistant message is active, track it.
        const id = (assistantMsg as any)?.info?.id;
        if (!activeAssistantMessageIDRef.current && typeof id === 'string') {
            activeAssistantMessageIDRef.current = id;
        }

        // If we transition away from pending (either to running or idle), stop showing the pending indicator.
        if (isWaitingRef.current) {
            setIsWaiting(false);
            isWaitingRef.current = false;
            if (waitingTimeoutRef.current) {
                clearTimeout(waitingTimeoutRef.current);
                waitingTimeoutRef.current = null;
            }
        }

        if (completed) {
            activeAssistantMessageIDRef.current = null;
            activeRequestStartedAtRef.current = null;
        }
    };

    const pollServerState = (reason: string) => {
        if (!sessionId) return;
        console.log(`[pilot] polling server state (${reason})`);
        GetMessages(sessionId)
            .then((msgs: any[]) => syncPilotFromMessages(msgs))
            .catch(err => console.error(`[pilot] poll failed (${reason}):`, err));
    };

    useEffect(() => {
        isWaitingRef.current = isWaiting;
    }, [isWaiting]);

    useEffect(() => {
        // No session -> always idle
        if (!sessionId) {
            activeAssistantMessageIDRef.current = null;
            activeRequestStartedAtRef.current = null;
            emitPilotStatus('idle');
        }
    }, [sessionId]);

    useEffect(() => {
        if (!sessionId) return;

        const intervalId = window.setInterval(() => {
            const status = pilotStatusRef.current;
            if (status === 'idle') return;

            const sinceLast = Date.now() - lastRelevantEventAtRef.current;
            // Avoid polling while events are flowing.
            if (sinceLast < POLL_INTERVAL_MS) return;

            pollServerState('interval');
        }, POLL_INTERVAL_MS);

        return () => {
            clearInterval(intervalId);
        };
    }, [sessionId]);

    useEffect(() => {
        if (sessionId) {
            const unsubscribe = EventsOn('server-event', (event: ServerEvent) => {
                console.log('Received event:', event);
                
                // message.part.updated イベントの処理
                if (event.type === 'message.part.updated') {
                    const part = event.properties.part;
                    const delta = event.properties.delta;
                    
                    console.log('📦 Part update:', {
                        type: part.type,
                        partId: part.id,
                        messageId: part.messageID,
                        hasText: !!part.text,
                        textLength: part.text?.length,
                        hasDelta: !!delta,
                        deltaLength: delta?.length,
                        toolState: part.state?.status
                    });
                    
                    // セッションIDのチェック
                    if (part.sessionID !== sessionId) {
                        console.log(`Event sessionID ${part.sessionID} does not match current sessionId ${sessionId}, ignoring`);
                        return;
                    }

                    lastRelevantEventAtRef.current = Date.now();

                    setError(null);

                    // We received streaming evidence -> running
                    emitPilotStatus('running');

                    // If we are tracking a specific assistant message, infer it from the part if needed
                    if (!activeAssistantMessageIDRef.current && typeof part.messageID === 'string') {
                        activeAssistantMessageIDRef.current = part.messageID;
                    }

                    // サーバーからの最初のイベント受信時にwaiting状態をクリア
                    if (isWaitingRef.current) {
                        setIsWaiting(false);
                        isWaitingRef.current = false;
                        if (waitingTimeoutRef.current) {
                            clearTimeout(waitingTimeoutRef.current);
                            waitingTimeoutRef.current = null;
                        }
                    }

                    setMessages(prevMessages => {
                        const existingMsgIndex = prevMessages.findIndex(m => m.info.id === part.messageID);

                        if (existingMsgIndex !== -1) {
                            // Update existing message
                            const updatedMessages = [...prevMessages];
                            const existingMessage = updatedMessages[existingMsgIndex];
                            
                            // ユーザーメッセージはパート更新を無視
                            if (existingMessage.info.role === 'user') {
                                return prevMessages;
                            }
                            
                            const partIndex = existingMessage.parts.findIndex(p => p.id === part.id);
                            if (partIndex !== -1) {
                                // Update existing part
                                const updatedParts = [...existingMessage.parts];
                                const existingPart = updatedParts[partIndex];
                                
                                if (existingPart.type === 'text' && part.type === 'text') {
                                    // delta があればそれを追加、なければ part.text をセット
                                    if (delta) {
                                        existingPart.text += delta;
                                    } else {
                                        existingPart.text = part.text || '';
                                    }
                                } else if (existingPart.type === 'reasoning' && part.type === 'reasoning') {
                                    existingPart.text = part.text || '';
                                } else if (existingPart.type === 'tool' && part.type === 'tool') {
                                    // Update tool part state
                                    Object.assign(existingPart, part);
                                }
                                updatedMessages[existingMsgIndex] = { ...existingMessage, parts: updatedParts };
                            } else {
                                // Add new part
                                if (part && typeof part === 'object') {
                                    updatedMessages[existingMsgIndex] = { 
                                        ...existingMessage, 
                                        parts: [...existingMessage.parts, part] 
                                    };
                                } else {
                                    console.warn('⚠️ Attempted to add null/invalid part:', part);
                                }
                            }
                            return updatedMessages;
                        } else {
                            // Don't create new messages from part.updated events
                            // New messages should only be created by:
                            // 1. GetMessages after SendMessage (for user messages)
                            // 2. message.updated events (for assistant messages)
                            // This prevents the flash of incorrect role when user sends a message
                            console.log(`🔎 Part update for unknown message ${part.messageID}, waiting for message.updated`);
                            return prevMessages;
                        }
                    });
                } else if (event.type === 'message.updated') {
                    // message.updated イベントの処理
                    const messageInfo = event.properties.info;
                    
                    console.log('📨 Message update:', {
                        messageId: messageInfo.id,
                        role: messageInfo.role,
                        completed: messageInfo.time?.completed
                    });
                    
                    if (messageInfo.sessionID !== sessionId) {
                        return;
                    }

                    lastRelevantEventAtRef.current = Date.now();

                    // Track the active assistant message if we don't have one yet
                    if (messageInfo.role === 'assistant' && typeof messageInfo.id === 'string') {
                        if (!activeAssistantMessageIDRef.current) {
                            activeAssistantMessageIDRef.current = messageInfo.id;
                        }
                    }

                    setError(null);

                    // assistant が更新された/作成された → running
                    if (messageInfo.role === 'assistant' && !messageInfo.time?.completed) {
                        emitPilotStatus('running');
                    }
                    
                    // メッセージ完了時にwaiting状態をクリアし、最終状態を同期
                    if (messageInfo.time?.completed) {
                        emitPilotStatus('idle');
                        activeAssistantMessageIDRef.current = null;
                        activeRequestStartedAtRef.current = null;

                        if (isWaitingRef.current) {
                            setIsWaiting(false);
                            isWaitingRef.current = false;
                            if (waitingTimeoutRef.current) {
                                clearTimeout(waitingTimeoutRef.current);
                                waitingTimeoutRef.current = null;
                            }
                        }
                        
                        // メッセージ完了時にGetMessagesで最終状態を同期
                        // これによりreasoningパートのみのメッセージも正しく表示される
                        console.log('Message completed - syncing final state');
                        GetMessages(sessionId)
                            .then(msgs => {
                                const cleanedMessages = msgs.map(msg => ({
                                    ...msg,
                                    parts: msg.parts.filter(p => p && typeof p === 'object')
                                }));
                                setMessages(cleanedMessages);
                            })
                            .catch(err => console.error('Failed to sync messages:', err));
                    }
                    
                    setMessages(prevMessages => {
                        const existingMsgIndex = prevMessages.findIndex(m => m.info.id === messageInfo.id);
                        if (existingMsgIndex !== -1) {
                            // Update existing message info
                            const updatedMessages = [...prevMessages];
                            const existingMessage = updatedMessages[existingMsgIndex];
                            
                            if (existingMessage.info.role !== messageInfo.role) {
                                console.log('📝 Updating role:', {
                                    messageId: messageInfo.id,
                                    oldRole: existingMessage.info.role,
                                    newRole: messageInfo.role,
                                });
                            }
                            
                            updatedMessages[existingMsgIndex] = {
                                ...existingMessage,
                                info: messageInfo,
                            };
                            return updatedMessages;
                        } else {
                            // Create new message from message.updated event
                            // This typically happens for assistant messages
                            console.log('🆕 Creating new message from message.updated:', {
                                messageId: messageInfo.id,
                                role: messageInfo.role,
                            });
                            
                            const newMessage = {
                                info: messageInfo,
                                parts: [],
                            };
                            return [...prevMessages, newMessage];
                        }
                    });
                } else if (event.type === 'session.updated') {
                    // session.updated イベントの処理
                    const sessionInfo = event.properties.info;
                    
                    if (sessionInfo.id !== sessionId) {
                        return;
                    }
                    
                    // セッション情報の更新（タイトルやサマリーなど）
                    // 現在は特に何もしないが、将来的にセッションタイトルを表示する場合に使用
                    console.log('Session updated:', sessionInfo);
                }
            });

            return () => {
                unsubscribe();
            };
        }
    }, [sessionId, onPilotStatusChange]);

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
                .then(msgs => {
                    // Filter out null parts from messages
                    const cleanedMessages = msgs.map(msg => ({
                        ...msg,
                        parts: msg.parts.filter(p => p && typeof p === 'object')
                    }));
                    setMessages(cleanedMessages);

                    // Determine pilot status from latest assistant message if possible
                    syncPilotFromMessages(cleanedMessages as any[]);
                })
                .catch(err => setError(`Failed to load messages: ${err}`))
                .finally(() => setIsLoading(false));
        } else {
            setMessages([]);
            activeAssistantMessageIDRef.current = null;
            activeRequestStartedAtRef.current = null;
            emitPilotStatus('idle');
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

        const currentInputValue = inputValue;
        setInputValue('');

        // メッセージ送信直後にwaiting状態を設定
        setIsWaiting(true);
        isWaitingRef.current = true;
        activeAssistantMessageIDRef.current = null;
        activeRequestStartedAtRef.current = Date.now() / 1000;
        lastRelevantEventAtRef.current = Date.now();
        emitPilotStatus('pending');
        
        // 仮のユーザーメッセージを即座に表示
        const tempMessageId = `temp_${Date.now()}`;
        const tempUserMessage = {
            info: {
                id: tempMessageId,
                sessionID: sessionId,
                role: 'user' as const,
                time: { created: Date.now() / 1000 },
            },
            parts: [{
                type: 'text',
                text: currentInputValue,
                id: `temp_part_${Date.now()}`,
            }],
        };
        setMessages(prev => [...prev, tempUserMessage]);
        
        // 10秒後にタイムアウトで状態確認
        // SSEが来ない/遅いケースでも、RESTで「完了したのか/まだ動いているのか」を判定する
        waitingTimeoutRef.current = window.setTimeout(() => {
            if (!isWaitingRef.current || !sessionId) return;
            setError('応答待ちです（ストリーム開始が遅延している可能性があります）');
            pollServerState('pending-timeout');
        }, 10000);

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
            agent: selectedAgent || undefined,
        });

        SendMessage(sessionId, chatInput)
            .then((resp: any) => {
                // If the API returns the assistant message, track it.
                const assistantID = resp?.info?.id;
                if (typeof assistantID === 'string') {
                    activeAssistantMessageIDRef.current = assistantID;
                }

                // メッセージ送信成功後、最新のメッセージ一覧を再取得
                // 仮のメッセージを実際のメッセージで置き換え
                GetMessages(sessionId)
                    .then((msgs: any[]) => {
                        // Filter out null parts from messages
                        const cleanedMessages = msgs.map((msg: any) => ({
                            ...msg,
                            parts: msg.parts.filter((p: any) => p && typeof p === 'object')
                        }));
                        // 仮メッセージを削除して実際のメッセージで置き換え
                        setMessages(prev => {
                            const withoutTemp = prev.filter(m => !m.info.id.startsWith('temp_'));
                            return cleanedMessages;
                        });

                        // If we can already observe an assistant message that isn't completed, we are effectively running
                        syncPilotFromMessages(cleanedMessages);
                    })
                    .catch(err => console.error('Failed to reload messages:', err));
                setError(null);
            })
            .catch(err => {
                setError(`Failed to send message: ${err}`);
                // エラー時はwaiting状態をクリア
                setIsWaiting(false);
                isWaitingRef.current = false;
                emitPilotStatus('idle');
                if (waitingTimeoutRef.current) {
                    clearTimeout(waitingTimeoutRef.current);
                    waitingTimeoutRef.current = null;
                }
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
                {messages.map((msg, index) => {
                    console.log(`💬 Message ${index}:`, {
                        id: msg.info.id,
                        role: msg.info.role,
                        partsCount: msg.parts.length,
                        parts: msg.parts.map(p => p ? { type: p.type, id: p.id, hasText: !!p.text, textPreview: p.text?.substring(0, 50) } : null)
                    });
                    
                    // Filter parts to only those that will be displayed
                    const displayableParts = msg.parts.filter(part => {
                        if (!part || typeof part !== 'object') return false;
                        // Internal parts that won't be displayed
                        if (part.type === 'step-start' || part.type === 'step-finish') return false;
                        // Metadata parts that won't be displayed
                        if (['snapshot', 'patch', 'agent', 'retry'].includes(part.type)) return false;
                        return true;
                    });
                    
                    // Skip rendering messages with no displayable parts
                    if (displayableParts.length === 0) {
                        console.log(`⚠️ Skipping message ${index} - no displayable parts`);
                        return null;
                    }
                    
                    return (
                    <div key={index} className={`message ${msg.info.role}`}>
                        {msg.parts.map((part, pIndex) => {
                            if (!part || typeof part !== 'object') {
                                console.warn(`⚠️ Invalid part at index ${pIndex}:`, part);
                                return null;
                            }
                            
                            // Filter internal parts that shouldn't be rendered
                            if (part.type === 'step-start' || part.type === 'step-finish') {
                                return null;
                            }
                            
                            if (part.type === 'text' && typeof part.text === 'string') {
                                console.log(`📝 Rendering text part ${pIndex}, length: ${part.text.length}`);
                                return (
                                    <ReactMarkdown key={pIndex} remarkPlugins={[remarkGfm]}>
                                        {part.text}
                                    </ReactMarkdown>
                                );
                            } else if (part.type === 'reasoning' && typeof part.text === 'string') {
                                return (
                                    <div key={pIndex} className="part-reasoning">
                                        <span className="part-label">💭 Thinking:</span> {part.text}
                                    </div>
                                );
                            } else if (part.type === 'tool') {
                                const toolPart = part as typeModels.ToolPart;
                                const status = toolPart.state?.status || 'unknown';
                                const title = toolPart.state?.title || toolPart.tool;
                                const statusIcon = status === 'completed' ? '✓' : status === 'running' ? '⚙️' : status === 'error' ? '❌' : '○';
                                
                                return (
                                    <div key={pIndex} className={`part-tool part-tool-${status}`}>
                                        <span className="part-label">{statusIcon} Tool [{toolPart.tool}]:</span> {title}
                                    </div>
                                );
                            }
                            
                            // Silently ignore other internal part types (like snapshot, patch, agent, retry)
                            // These are metadata parts not meant for direct display
                            if (['snapshot', 'patch', 'agent', 'retry'].includes(part.type)) {
                                return null;
                            }
                            
                            console.warn(`⚠️ Unknown part type "${part.type}" at index ${pIndex}`, part);
                            return null;
                        })}
                    </div>
                    );
                })}
                {/* Waiting indicator */}
                {isWaiting && (
                    <div className="message assistant waiting">
                        <div className="waiting-indicator">
                            <div className="spinner"></div>
                            <span>Thinking...</span>
                        </div>
                    </div>
                )}
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
