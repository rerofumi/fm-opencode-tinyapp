import React from 'react';
import { models } from '../../types';

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
            <button onClick={onSessionCreate}>New Session</button>
            <ul>
                {sessions.map((session) => (
                    <li
                        key={session.id}
                        className={currentSessionId === session.id ? 'active' : ''}
                        onClick={() => onSessionSelect(session.id)}
                    >
                        {session.title || 'Untitled Session'}
                        <button onClick={() => onSessionDelete(session.id)}>X</button>
                    </li>
                ))}
            </ul>
        </div>
    );
};
