import React from 'react';
import { models } from '../../../wailsjs/go/models';

interface SessionListProps {
    sessions: models.Session[];
    currentSessionId: string | null;
    onSessionSelect: (id: string) => void;
    onSessionCreate: () => void;
    onSessionDelete: (id: string) => void;
}

export const SessionList: React.FC<SessionListProps> = ({
    sessions,
    currentSessionId,
    onSessionSelect,
    onSessionCreate,
    onSessionDelete,
}) => {
    // 防御的プログラミング: sessionsが配列であることを確認
    if (!Array.isArray(sessions)) {
        console.error('SessionList: sessions is not an array', sessions);
        return (
            <div className="session-list">
                <div className="session-list-header">
                    <h3>Sessions</h3>
                    <button onClick={onSessionCreate} title="New Session (Ctrl+N)">+</button>
                </div>
                <div className="error-message">Invalid sessions data</div>
            </div>
        );
    }

    return (
        <div className="session-list">
            <div className="session-list-header">
                <h3>Sessions</h3>
                <button onClick={onSessionCreate} title="New Session (Ctrl+N)">+</button>
            </div>
            <ul>
                {sessions.map((session) => {
                    // session オブジェクトの安全性をチェック
                    if (!session || typeof session !== 'object' || !session.id) {
                        console.error('Invalid session object:', session);
                        return null;
                    }
                    
                    return (
                        <li
                            key={session.id}
                            className={`session-item ${currentSessionId === session.id ? 'active' : ''}`}
                            onClick={() => onSessionSelect(session.id)}
                        >
                            <span className="session-title">{session.title || 'Untitled Session'}</span>
                            <button
                                className="delete-session-btn"
                                onClick={(e) => {
                                    e.stopPropagation(); // Prevent li's onClick from firing
                                    onSessionDelete(session.id);
                                }}
                            >
                                ×
                            </button>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
};
