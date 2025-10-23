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
    return (
        <div className="session-list">
            <div className="session-list-header">
                <h3>Sessions</h3>
                <button onClick={onSessionCreate} title="New Session (Ctrl+N)">+</button>
            </div>
            <ul>
                {sessions.map((session) => (
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
                ))}
            </ul>
        </div>
    );
};
