package services

import (
	"encoding/json"
	"opencode-gui-client/internal/models"
	"os"
	"path/filepath"
)

// AppConfigService handles the application's local configuration file.
type AppConfigService struct {
	configPath string
}

// NewAppConfigService creates a new AppConfigService, ensuring the config directory and file exist.
func NewAppConfigService() (*AppConfigService, error) {
	configDir, err := os.UserConfigDir()
	if err != nil {
		return nil, err
	}
	appConfigDir := filepath.Join(configDir, "opencode-gui-client")
	if err := os.MkdirAll(appConfigDir, 0750); err != nil {
		return nil, err
	}
	configPath := filepath.Join(appConfigDir, "config.json")

	// Create a default config file if it doesn't exist
	if _, err := os.Stat(configPath); os.IsNotExist(err) {
		defaultConfig := &models.AppConfig{
			ServerURL: "http://localhost:23450",
			LLM: models.LLMConfig{
				Provider: "OpenAI API互換",
				BaseURL:  "https://api.openai.com/v1",
				Model:    "gpt-4o",
				Prompt: `以下の文章をより自然で分かりやすく、丁寧な表現に修正してください。
誤字脱字や文法的な誤りも修正してください。
修正後の文書のみ出力し、返答などは不要です。
---
{修正したいテキストを入力してください}`,
			},
		}
		data, marshalErr := json.MarshalIndent(defaultConfig, "", "  ")
		if marshalErr != nil {
			return nil, marshalErr
		}
		if writeErr := os.WriteFile(configPath, data, 0640); writeErr != nil {
			return nil, writeErr
		}
	}

	return &AppConfigService{
		configPath: configPath,
	}, nil
}

// GetAppConfig reads the configuration from the JSON file.
func (s *AppConfigService) GetAppConfig() (*models.AppConfig, error) {
	data, err := os.ReadFile(s.configPath)
	if err != nil {
		return nil, err
	}
	var config models.AppConfig
	if err := json.Unmarshal(data, &config); err != nil {
		return nil, err
	}
	return &config, nil
}

// UpdateAppConfig writes the given configuration to the JSON file.
func (s *AppConfigService) UpdateAppConfig(config *models.AppConfig) error {
	data, err := json.MarshalIndent(config, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(s.configPath, data, 0640)
}
