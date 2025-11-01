import React, { useState, useEffect } from 'react';
import { GetAppConfig, UpdateAppConfig } from '../../../wailsjs/go/main/App';
import { models } from '../../../wailsjs/go/models';

interface SettingsProps {
    onClose: () => void;
}

type TabType = 'connection' | 'llm';

export const Settings: React.FC<SettingsProps> = ({ onClose }) => {
    const [config, setConfig] = useState<models.AppConfig | null>(null);
    const [activeTab, setActiveTab] = useState<TabType>('connection');

    useEffect(() => {
        // Load settings from Go backend on component mount
        GetAppConfig().then(setConfig);
    }, []);

    const handleSave = () => {
        if (config) {
            UpdateAppConfig(config)
                .then(() => {
                    alert("Settings saved. Please restart the application for the changes to take full effect.");
                    onClose();
                })
                .catch(err => {
                    alert(`Failed to save settings: ${err}`);
                });
        }
    };

    const handleServerURLChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (config) {
            setConfig(models.AppConfig.createFrom({ ...config, serverURL: e.target.value }));
        }
    };

    const handleLLMChange = (field: keyof models.LLMConfig, value: string) => {
        if (config) {
            const newLLM = { ...config.llm, [field]: value };
            setConfig(models.AppConfig.createFrom({ ...config, llm: newLLM }));
        }
    };

    if (!config) {
        return <div className="modal-backdrop">Loading...</div>;
    }

    return (
        <div className="modal-backdrop">
            <div className="modal-content">
                <h2>Settings</h2>
                
                <div className="tabs">
                    <button 
                        className={activeTab === 'connection' ? 'active' : ''}
                        onClick={() => setActiveTab('connection')}
                    >
                        Connection
                    </button>
                    <button 
                        className={activeTab === 'llm' ? 'active' : ''}
                        onClick={() => setActiveTab('llm')}
                    >
                        LLM
                    </button>
                </div>

                {activeTab === 'connection' && (
                    <div className="tab-content">
                        <div className="form-group">
                            <label htmlFor="serverURL">OpenCode Server URL</label>
                            <input
                                id="serverURL"
                                type="text"
                                value={config.serverURL}
                                onChange={handleServerURLChange}
                            />
                        </div>
                    </div>
                )}

                {activeTab === 'llm' && (
                    <div className="tab-content">
                        <div className="form-group">
                            <label htmlFor="provider">Provider</label>
                            <input
                                id="provider"
                                type="text"
                                value={config.llm?.provider || ''}
                                onChange={(e) => handleLLMChange('provider', e.target.value)}
                                placeholder="OpenAI API互換"
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="baseURL">Base URL</label>
                            <input
                                id="baseURL"
                                type="text"
                                value={config.llm?.baseURL || ''}
                                onChange={(e) => handleLLMChange('baseURL', e.target.value)}
                                placeholder="https://api.openai.com/v1"
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="apiKey">API Key</label>
                            <input
                                id="apiKey"
                                type="password"
                                value={config.llm?.apiKey || ''}
                                onChange={(e) => handleLLMChange('apiKey', e.target.value)}
                                placeholder="sk-..."
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="model">Model</label>
                            <input
                                id="model"
                                type="text"
                                value={config.llm?.model || ''}
                                onChange={(e) => handleLLMChange('model', e.target.value)}
                                placeholder="gpt-4o"
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="prompt">Prompt</label>
                            <textarea
                                id="prompt"
                                value={config.llm?.prompt || ''}
                                onChange={(e) => handleLLMChange('prompt', e.target.value)}
                                rows={10}
                                placeholder="Please revise the following text to be more natural, clear, and polite.
Please also correct any typos, grammatical errors, or overuse of honorifics.
Prioritize readability, adjusting punctuation and line breaks as necessary.
---
"
                            />
                        </div>
                    </div>
                )}

                <div className="modal-actions">
                    <button onClick={handleSave}>Save</button>
                    <button onClick={onClose}>Cancel</button>
                </div>
            </div>
        </div>
    );
};
