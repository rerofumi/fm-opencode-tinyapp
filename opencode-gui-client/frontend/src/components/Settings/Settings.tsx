import React from 'react';

interface SettingsProps {
    onClose: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ onClose }) => {
    return (
        <div className="settings-modal">
            <h2>Settings</h2>
            {/* Settings form will be here */}
            <button onClick={onClose}>Close</button>
        </div>
    );
};
