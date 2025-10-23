import React, { useState, useEffect } from 'react';
import { SessionList } from './components/Session/SessionList';
import { ChatPanel } from './components/Chat/ChatPanel';
import { Settings } from './components/Settings/Settings';
import { GetSessions } from '../wailsjs/go/main/App';
import { models } from './types';
import './App.css';

function App() {
    const [sessions, setSessions] = useState<models.Session[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [showSettings, setShowSettings] = useState(false);

    useEffect(() => {
        // Fetch sessions on component mount
        GetSessions().then(setSessions).catch(console.error);
    }, []);

    const handleSessionCreate = () => {
        // Placeholder for creating a new session
        console.log('Creating new session');
    };

    const handleSessionDelete = (id: string) => {
        // Placeholder for deleting a session
        console.log(`Deleting session ${id}`);
    };

    return (
        <div id="App">
            <div className="sidebar">
                <SessionList
                    sessions={sessions}
                    currentSessionId={currentSessionId}
                    onSessionSelect={setCurrentSessionId}
                    onSessionCreate={handleSessionCreate}
                    onSessionDelete={handleSessionDelete}
                />
            </div>
            <div className="main-content">
                <ChatPanel sessionId={currentSessionId} />
            </div>
            <div className="statusbar">
                <button onClick={() => setShowSettings(true)}>Settings</button>
            </div>
            {showSettings && <Settings onClose={() => setShowSettings(false)} />}
        </div>
    );
}

export default App;
