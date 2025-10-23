import React from 'react';

interface ChatPanelProps {
    sessionId: string | null;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ sessionId }) => {
    if (!sessionId) {
        return <div>Select a session to start chatting</div>;
    }

    return (
        <div className="chat-panel">
            <div className="messages">
                {/* Messages will be rendered here */}
            </div>
            <div className="input-area">
                <textarea placeholder="Type your message... (Ctrl+Enter to send)" />
            </div>
        </div>
    );
};
