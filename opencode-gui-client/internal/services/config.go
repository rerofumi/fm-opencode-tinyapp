package services

import (
	"opencode-gui-client/internal/api"
	"opencode-gui-client/internal/models"
)

// ConfigService handles business logic for configuration.
type ConfigService struct {
	apiClient *api.Client
}

// NewConfigService creates a new ConfigService.
func NewConfigService(apiClient *api.Client) *ConfigService {
	return &ConfigService{apiClient: apiClient}
}

// GetConfig retrieves the server configuration.
func (s *ConfigService) GetConfig() (*models.ServerConfig, error) {
	return s.apiClient.GetConfig()
}

// GetProviders retrieves the list of available providers and models.
func (s *ConfigService) GetProviders() (*models.ProvidersResponse, error) {
	return s.apiClient.GetProviders()
}
