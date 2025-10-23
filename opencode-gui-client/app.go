package main

import (
	"context"
	"log"
	"opencode-gui-client/internal/api"
	"opencode-gui-client/internal/models"
	"opencode-gui-client/internal/services"
)

// App struct holds the application's state and services.
type App struct {
	ctx              context.Context
	sessionService   *services.SessionService
	messageService   *services.MessageService
	configService    *services.ConfigService
	fileService      *services.FileService
	appConfigService *services.AppConfigService
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// and services are initialized.
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx

	// Initialize the app config service first
	appConfigService, err := services.NewAppConfigService()
	if err != nil {
		log.Fatalf("Failed to initialize app config service: %v", err)
	}
	a.appConfigService = appConfigService

	// Load the config to get the server URL
	appConfig, err := a.appConfigService.GetAppConfig()
	if err != nil {
		log.Fatalf("Failed to load app config: %v", err)
	}

	// Initialize API client with the loaded URL
	apiClient := api.NewClient(appConfig.ServerURL)

	a.sessionService = services.NewSessionService(apiClient)
	a.messageService = services.NewMessageService(apiClient)
	a.configService = services.NewConfigService(apiClient)
	a.fileService = services.NewFileService(apiClient)
}

// === アプリケーション設定関連 ===

// GetAppConfig returns the local application configuration.
func (a *App) GetAppConfig() (*models.AppConfig, error) {
	return a.appConfigService.GetAppConfig()
}

// UpdateAppConfig updates the local application configuration.
func (a *App) UpdateAppConfig(config *models.AppConfig) error {
	return a.appConfigService.UpdateAppConfig(config)
}


// === サーバー設定関連 ===

// GetConfig returns the server configuration.
func (a *App) GetConfig() (*models.ServerConfig, error) {
	return a.configService.GetConfig()
}

// === セッション関連 ===

// GetSessions returns all sessions.
func (a *App) GetSessions() ([]models.Session, error) {
	return a.sessionService.GetSessions()
}

// GetSession returns a single session by ID.
func (a *App) GetSession(id string) (*models.Session, error) {
	return a.sessionService.GetSession(id)
}

// CreateSession creates a new session.
func (a *App) CreateSession(title string) (*models.Session, error) {
	return a.sessionService.CreateSession(title)
}

// UpdateSession updates a session.
func (a *App) UpdateSession(id string, title string) (*models.Session, error) {
	return a.sessionService.UpdateSession(id, title)
}

// DeleteSession deletes a session.
func (a *App) DeleteSession(id string) error {
	return a.sessionService.DeleteSession(id)
}

// === メッセージ関連 ===

// GetMessages returns all messages for a session.
func (a *App) GetMessages(sessionID string) ([]models.MessageWithParts, error) {
	return a.messageService.GetMessages(sessionID)
}

// SendMessage sends a message to a session.
func (a *App) SendMessage(sessionID string, req *models.ChatInput) (*models.MessageWithParts, error) {
	return a.messageService.SendMessage(sessionID, req)
}

// === ファイル操作関連 ===

// FindInFiles searches for a pattern in files.
func (a *App) FindInFiles(pattern string) ([]models.SearchResult, error) {
	return a.fileService.FindInFiles(pattern)
}

// FindFiles finds files by a query.
func (a *App) FindFiles(query string) ([]string, error) {
	return a.fileService.FindFiles(query)
}

// FindSymbols finds symbols by a query.
func (a *App) FindSymbols(query string) ([]models.Symbol, error) {
	return a.fileService.FindSymbols(query)
}

// ReadFile reads the content of a file.
func (a *App) ReadFile(path string) (*models.FileContent, error) {
	return a.fileService.ReadFile(path)
}
