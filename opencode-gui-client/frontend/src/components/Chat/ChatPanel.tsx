import React, { useState, useEffect } from 'react';
import { GetMessages, SendMessage } from '../../../wailsjs/go/main/App';
import { models } from '../../../wailsjs/go/models';

interface ChatPanelProps {
    sessionId: string | null;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ sessionId }) => {
    const [messages, setMessages] = useState<models.MessageWithParts[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (sessionId) {
            setIsLoading(true);
            setError(null);
            GetMessages(sessionId)
                .then(setMessages)
                .catch(err => setError(`Failed to load messages: ${err}`))
                .finally(() => setIsLoading(false));
        } else {
            setMessages([]);
        }
    }, [sessionId]);

    const handleSendMessage = () => {
        if (!sessionId || !inputValue.trim()) return;

        const textPart = models.TextInputPart.createFrom({
            type: "text",
            text: inputValue,
        });

        const chatInput = models.ChatInput.createFrom({
            parts: [textPart],
        });

        setIsLoading(true);
        SendMessage(sessionId, chatInput)
            .then(newMessage => {
                setMessages(prev => [...prev, newMessage]);
                setInputValue('');
            })
            .catch(err => setError(`Failed to send message: ${err}`))
            .finally(() => setIsLoading(false));
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            e.preventDefault();
            handleSendMessage();
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
            <div className="messages-container">
                {messages.map((msg, index) => (
                    <div key={index} className={`message ${msg.info.role}`}>
                        {/* Render parts as any for now */}
                        {(msg.parts as any[])
                            .filter(part => part.type === 'text' && part.text)
                            .map((part, pIndex) => (
                                <p key={pIndex}>{part.text}</p>
                            ))
                        }
                    </div>
                ))}
            </div>
            <div className="input-area">
                <textarea
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your message... (Ctrl+Enter to send)"
                    disabled={isLoading}
                />
            </div>
        </div>
    );
};
