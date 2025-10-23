import React, { useState, useEffect, useCallback } from 'react';
import { SessionList } from './components/Session/SessionList';
import { ChatPanel } from './components/Chat/ChatPanel';
import { Settings } from './components/Settings/Settings';
import { GetSessions, CreateSession, DeleteSession } from '../wailsjs/go/main/App';
import { models } from '../wailsjs/go/models';
import './App.css';

function App() {
    const [sessions, setSessions] = useState<models.Session[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [showSettings, setShowSettings] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadSessions = useCallback(() => {
        GetSessions()
            .then(setSessions)
            .catch(err => setError(`Failed to load sessions: ${err}`));
    }, []);

    useEffect(() => {
        loadSessions();
    }, [loadSessions]);

    const handleSessionCreate = useCallback(() => {
        CreateSession("New Session")
            .then((newSession) => {
                loadSessions(); // Reload sessions after creating a new one
                setCurrentSessionId(newSession.id);
            })
            .catch(err => setError(`Failed to create session: ${err}`));
    }, [loadSessions]);

    const handleSessionDelete = useCallback((id: string) => {
        if (window.confirm('Are you sure you want to delete this session?')) {
            DeleteSession(id)
                .then(() => {
                    loadSessions(); // Reload sessions
                    if (currentSessionId === id) {
                        setCurrentSessionId(null);
                    }
                })
                .catch(err => setError(`Failed to delete session: ${err}`));
        }
    }, [currentSessionId, loadSessions]);

    const handleSessionSelect = (id: string) => {
        setCurrentSessionId(id);
    };

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey) {
                switch (e.key) {
                    case 'n':
                        e.preventDefault();
                        handleSessionCreate();
                        break;
                    case ',':
                        e.preventDefault();
                        setShowSettings(true);
                        break;
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [handleSessionCreate]);


    return (
        <div id="App">
            <div className="sidebar">
                <SessionList
                    sessions={sessions}
                    currentSessionId={currentSessionId}
                    onSessionSelect={handleSessionSelect}
                    onSessionCreate={handleSessionCreate}
                    onSessionDelete={handleSessionDelete}
                />
            </div>
            <div className="main-content">
                <ChatPanel sessionId={currentSessionId} />
            </div>
            <div className="statusbar">
                {error && <div className="error-message">{error}</div>}
                <div className="status-info">
                    <span>{sessions.length} sessions</span>
                </div>
                <button onClick={() => setShowSettings(true)} title="Settings (Ctrl+,)">⚙️</button>
            </div>
            {showSettings && <Settings onClose={() => setShowSettings(false)} />}
        </div>
    );
}

export default App;
