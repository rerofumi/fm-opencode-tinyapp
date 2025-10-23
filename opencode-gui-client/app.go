package main

import (
	"context"
	"opencode-gui-client/internal/api"
	"opencode-gui-client/internal/models"
)

// App struct
type App struct {
	ctx       context.Context
	apiClient *api.Client
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	// For now, we'll use a hardcoded URL. This should be configurable later.
	a.apiClient = api.NewClient("http://localhost:8080")
}

// GetSessions returns all sessions.
func (a *App) GetSessions() ([]models.Session, error) {
	return a.apiClient.GetSessions()
}

// GetConfig returns the server configuration.
func (a *App) GetConfig() (*models.ServerConfig, error) {
	return a.apiClient.GetConfig()
}
