import React, { useState, useEffect } from 'react';
import { GetAppConfig, UpdateAppConfig } from '../../../wailsjs/go/main/App';
import { models } from '../../../wailsjs/go/models';

interface SettingsProps {
    onClose: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ onClose }) => {
    const [config, setConfig] = useState<models.AppConfig | null>(null);

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

    if (!config) {
        return <div className="modal-backdrop">Loading...</div>;
    }

    return (
        <div className="modal-backdrop">
            <div className="modal-content">
                <h2>Settings</h2>
                <div className="form-group">
                    <label htmlFor="serverURL">OpenCode Server URL</label>
                    <input
                        id="serverURL"
                        type="text"
                        value={config.serverURL}
                        onChange={handleServerURLChange}
                    />
                </div>
                <div className="modal-actions">
                    <button onClick={handleSave}>Save</button>
                    <button onClick={onClose}>Cancel</button>
                </div>
            </div>
        </div>
    );
};
