package services

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"fm-opencode-tinyapp/internal/api"
	"fm-opencode-tinyapp/internal/models"
)

// ConfigService handles business logic for configuration.
type ConfigService struct {
	apiClient *api.Client
	configDir string
}

// NewConfigService creates a new ConfigService.
func NewConfigService(apiClient *api.Client) *ConfigService {
	// Get user config directory
	configDir, err := os.UserConfigDir()
	if err != nil {
		configDir = "."
	}
	configDir = filepath.Join(configDir, "fm-opencode-tinyapp")

	return &ConfigService{
		apiClient: apiClient,
		configDir: configDir,
	}
}

// GetConfig retrieves the server configuration.
func (s *ConfigService) GetConfig() (*models.ServerConfig, error) {
	return s.apiClient.GetConfig()
}

// GetProviders retrieves the list of available providers and models.
func (s *ConfigService) GetProviders() (*models.ProvidersResponse, error) {
	return s.apiClient.GetProviders()
}

// GetAgents retrieves the list of available agents.
func (s *ConfigService) GetAgents() ([]models.Agent, error) {
	return s.apiClient.GetAgents()
}

// GetAppConfig retrieves the application configuration.
func (s *ConfigService) GetAppConfig() (*models.AppConfig, error) {
	configPath := filepath.Join(s.configDir, "config.json")

	data, err := os.ReadFile(configPath)
	if err != nil {
		// Return default config if file doesn't exist
		return &models.AppConfig{
			LLM: models.LLMConfig{
				Provider: "OpenAI API compatible",
				BaseURL:  "https://api.openai.com/v1",
				Model:    "gpt-4o",
				Prompt: `Please revise the following text to be more natural, clear, and polite.
Also correct any typos, grammatical errors.
---
`,
			},
		}, nil
	}

	var config models.AppConfig
	if err := json.Unmarshal(data, &config); err != nil {
		return nil, fmt.Errorf("failed to parse config: %w", err)
	}

	return &config, nil
}

// SaveAppConfig saves the application configuration.
func (s *ConfigService) SaveAppConfig(config *models.AppConfig) error {
	// Create config directory if it doesn't exist
	if err := os.MkdirAll(s.configDir, 0755); err != nil {
		return fmt.Errorf("failed to create config directory: %w", err)
	}

	configPath := filepath.Join(s.configDir, "config.json")
	data, err := json.MarshalIndent(config, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal config: %w", err)
	}

	if err := os.WriteFile(configPath, data, 0644); err != nil {
		return fmt.Errorf("failed to write config file: %w", err)
	}

	return nil
}
