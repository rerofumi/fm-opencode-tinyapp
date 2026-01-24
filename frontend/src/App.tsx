import React, { useState, useEffect, useCallback } from 'react';
import { SessionList } from './components/Session/SessionList';
import { ChatPanel } from './components/Chat/ChatPanel';
import { Settings } from './components/Settings/Settings';
import { GetSessions, CreateSession, DeleteSession, GetProviders, GetAgents, GetSessionTokens } from '../wailsjs/go/main/App';
import { models } from '../wailsjs/go/models';
import { EventsOn } from '../wailsjs/runtime';
import './App.css';

type PilotStatus = 'idle' | 'pending' | 'running';

function App() {
    const [sessions, setSessions] = useState<models.Session[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [showSettings, setShowSettings] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentModel, setCurrentModel] = useState<string | null>(null);
    const [providers, setProviders] = useState<models.Provider[]>([]);
    const [selectedModel, setSelectedModel] = useState<{ providerId: string; modelId: string } | null>(null);
    const [agents, setAgents] = useState<models.Agent[]>([]);
    const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
    const [tokenInfo, setTokenInfo] = useState<models.SessionTokens | null>(null);

    // 3-state pilot lamp:
    // - idle: input-ready
    // - pending: message sent, waiting for first stream event
    // - running: agent producing/streaming until message.completed
    const [pilotStatus, setPilotStatus] = useState<PilotStatus>('idle');

    const loadTokenInfo = useCallback((sessionId: string) => {
        GetSessionTokens(sessionId)
            .then(setTokenInfo)
            .catch(err => {
                console.error(`Failed to load token info: ${err}`);
                setTokenInfo(null);
            });
    }, []);

    const loadData = useCallback(() => {
        GetSessions()
            .then(setSessions)
            .catch(err => setError(`Failed to load sessions: ${err}`));
        GetProviders()
            .then(response => {
                setProviders(response.providers);
                // Set default model if available
                if (response.default) {
                    setSelectedModel({ providerId: response.default.id, modelId: response.default.model });
                }
            })
            .catch(err => setError(`Failed to load providers: ${err}`));
        GetAgents()
            .then(setAgents)
            .catch(err => setError(`Failed to load agents: ${err}`));
    }, []);

    useEffect(() => {
        loadData();

        // session.updated イベントをリッスンしてセッション一覧を更新
        const unsubscribe = EventsOn('server-event', (event: any) => {
            if (event.type === 'session.updated') {
                const sessionInfo = event.properties?.info;
                if (sessionInfo) {
                    setSessions(prevSessions => {
                        const existingIndex = prevSessions.findIndex(s => s.id === sessionInfo.id);
                        if (existingIndex !== -1) {
                            // 既存セッションを更新
                            const updatedSessions = [...prevSessions];
                            updatedSessions[existingIndex] = sessionInfo;
                            return updatedSessions;
                        } else {
                            // 新規セッションを追加
                            return [...prevSessions, sessionInfo];
                        }
                    });
                }
            } else if (event.type === 'message.updated') {
                // メッセージ更新時にトークン情報を再取得
                if (currentSessionId) {
                    loadTokenInfo(currentSessionId);
                }
            }
        });

        return () => {
            unsubscribe();
        };
    }, [loadData, currentSessionId, loadTokenInfo]);

    const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const parts = e.target.value.split(':');
        const providerId = parts[0];
        const modelId = parts.slice(1).join(':'); // Handle model IDs that contain colons
        setSelectedModel({ providerId, modelId });
    };

    const handleSessionCreate = useCallback(() => {
        CreateSession("New Session")
            .then((newSession) => {
                loadData();
                setCurrentSessionId(newSession.id);
                setPilotStatus('idle');
            })
            .catch(err => setError(`Failed to create session: ${err}`));
    }, [loadData]);

    const handleSessionDelete = useCallback((id: string) => {
        if (window.confirm('Are you sure you want to delete this session?')) {
            DeleteSession(id)
                .then(() => {
                    loadData();
                    if (currentSessionId === id) {
                        setCurrentSessionId(null);
                        setPilotStatus('idle');
                    }
                })
                .catch(err => setError(`Failed to delete session: ${err}`));
        }
    }, [currentSessionId, loadData]);

    const handleSessionSelect = (id: string) => {
        setCurrentSessionId(id);
        setCurrentModel(null); // Reset model when session changes
        setPilotStatus('idle');
        loadTokenInfo(id);
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


    const pilotTitle =
        pilotStatus === 'pending'
            ? 'Pending (waiting for first response)'
            : pilotStatus === 'running'
                ? 'Running (agent is working)'
                : 'Idle (input-ready)';

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
                <div className="header">
                    <h1>OpenCode GUI</h1>
                    <div className="header-controls">
                        <div className={`pilot-lamp ${pilotStatus}`} title={pilotTitle}></div>
                        <label htmlFor="agent-select">Agent:</label>
                        <select id="agent-select" onChange={e => setSelectedAgent(e.target.value)} value={selectedAgent || ''}>
                            <option value="">default</option>
                            {agents.map(agent => (
                                <option key={agent.name} value={agent.name}>
                                    {agent.name}
                                </option>
                            ))}
                        </select>
                        <label htmlFor="model-select">Model change:</label>
                        <select id="model-select" onChange={handleModelChange} value={selectedModel ? `${selectedModel.providerId}:${selectedModel.modelId}` : ''}>
                            {providers.map(provider => (
                                <optgroup label={provider.name} key={provider.id}>
                                    {Object.entries(provider.models).map(([modelId, model]) => (
                                        <option key={`${provider.id}:${modelId}`} value={`${provider.id}:${modelId}`}>
                                            {model.name}
                                        </option>
                                    ))}
                                </optgroup>
                            ))}
                        </select>
                        <button onClick={() => setShowSettings(true)} title="Settings (Ctrl+,)">⚙️</button>
                    </div>
                </div>
                <ChatPanel
                    sessionId={currentSessionId}
                    onModelUpdate={setCurrentModel}
                    selectedModel={selectedModel}
                    selectedAgent={selectedAgent}
                    onPilotStatusChange={setPilotStatus}
                    pilotStatus={pilotStatus}
                />
                <div className="statusbar">
                    {error && <div className="error-message">{error}</div>}
                    <div className="status-info">
                        <span>{sessions.length} sessions</span>
                        {currentModel && (
                            <span className="model-info"> | {currentModel}</span>
                        )}
                        {tokenInfo && tokenInfo.max > 0 && (
                            <span 
                                className={`token-info ${
                                    tokenInfo.percentage > 90 ? 'high' : 
                                    tokenInfo.percentage > 70 ? 'medium' : 
                                    'normal'
                                }`}
                            >
                                {' | '}
                                {tokenInfo.used.toLocaleString()} / {tokenInfo.max.toLocaleString()} tokens
                                {' ('}{tokenInfo.percentage.toFixed(1)}%{')'}
                            </span>
                        )}
                    </div>
                </div>
            </div>
            {showSettings && <Settings onClose={() => setShowSettings(false)} />}
        </div>
    );
}

export default App;
