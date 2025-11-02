package main

import (
	"context"
	"fmt"
	"log"
	"fm-opencode-tinyapp/internal/api"
	"fm-opencode-tinyapp/internal/models"
	"fm-opencode-tinyapp/internal/services"

	"github.com/sirupsen/logrus"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct holds the application's state and services.
type App struct {
	ctx              context.Context
	sessionService   *services.SessionService
	messageService   *services.MessageService
	configService    *services.ConfigService
	fileService      *services.FileService
	appConfigService *services.AppConfigService
	streamClient     *api.StreamClient
	llmClient        *api.LLMClient
	logger           *logrus.Logger
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// and services are initialized.
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx

	// Initialize logger
	a.logger = logrus.New()
	a.logger.SetFormatter(&logrus.JSONFormatter{})
	a.logger.SetLevel(logrus.InfoLevel)

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
	a.streamClient = api.NewStreamClient(appConfig.ServerURL, a.logger)

	// Initialize LLM client
	if appConfig.LLM.BaseURL != "" && appConfig.LLM.APIKey != "" {
		a.llmClient = api.NewLLMClient(appConfig.LLM.BaseURL, appConfig.LLM.APIKey)
	}

	a.sessionService = services.NewSessionService(apiClient)
	a.messageService = services.NewMessageService(apiClient)
	a.configService = services.NewConfigService(apiClient)
	a.fileService = services.NewFileService(apiClient)

	// Start the event stream
	go a.startEventForwarding()
}

func (a *App) startEventForwarding() {
	eventChan, err := a.streamClient.SubscribeEvents(a.ctx)
	if err != nil {
		a.logger.Fatalf("Failed to subscribe to events: %v", err)
	}

	for {
		select {
		case <-a.ctx.Done():
			a.logger.Info("Context done, stopping event forwarding.")
			a.streamClient.Stop()
			return
			case event, ok := <-eventChan:
				if !ok {
					a.logger.Info("Event channel closed, stopping event forwarding.")
					return
				}
				a.logger.Infof("Forwarding event: Type=%s, Properties=%+v", 
					event.Type, event.Properties)
				runtime.EventsEmit(a.ctx, "server-event", event)
		}
	}
}

// Shutdown is called when the app is shutting down.
func (a *App) shutdown(ctx context.Context) {
	a.logger.Info("Shutting down application.")
	if a.streamClient != nil {
		a.streamClient.Stop()
	}
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

// GetProviders returns the list of available providers and models.
func (a *App) GetProviders() (*models.ProvidersResponse, error) {
	return a.configService.GetProviders()
}

// GetAgents returns the list of available agents.
func (a *App) GetAgents() ([]models.Agent, error) {
	return a.configService.GetAgents()
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

// === LLM関連 ===

// PolishText polishes the given text using LLM.
func (a *App) PolishText(text string) (string, error) {
	if a.llmClient == nil {
		return "", fmt.Errorf("LLM client not initialized")
	}

	// Get app config to get LLM settings
	appConfig, err := a.appConfigService.GetAppConfig()
	if err != nil {
		return "", fmt.Errorf("failed to get app config: %w", err)
	}

	req := &models.PolishTextRequest{
		Text:   text,
		Prompt: appConfig.LLM.Prompt,
		Model:  appConfig.LLM.Model,
	}

	resp, err := a.llmClient.PolishText(req)
	if err != nil {
		return "", fmt.Errorf("failed to polish text: %w", err)
	}

	return resp.PolishedText, nil
}
