package main

import (
	"context"
	"fm-opencode-tinyapp/internal/api"
	"fm-opencode-tinyapp/internal/models"
	"fm-opencode-tinyapp/internal/services"
	"fmt"
	"log"
	"net"
	"net/url"
	"os"
	"os/exec"
	"strings"
	"time"

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
	opencodeProcess  *exec.Cmd
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

	if err := a.ensureOpenCodeServer(appConfig.ServerURL); err != nil {
		a.logger.Warnf("failed to ensure opencode server: %v", err)
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

			// Forward the original event to the frontend
			runtime.EventsEmit(a.ctx, "server-event", event)
		}
	}
}

func (a *App) ensureOpenCodeServer(serverURL string) error {
	parsedURL, err := url.Parse(serverURL)
	if err != nil {
		return fmt.Errorf("invalid server URL %q: %w", serverURL, err)
	}

	if parsedURL.Host == "" {
		return fmt.Errorf("server URL %q has no host", serverURL)
	}

	if isTCPPortOpen(parsedURL.Host, 500*time.Millisecond) {
		return nil
	}

	cwd, err := os.Getwd()
	if err != nil {
		return fmt.Errorf("failed to get current directory: %w", err)
	}

	cmd := exec.Command("opencode", "serve", "--port", "23450")
	cmd.Dir = cwd
	if err := cmd.Start(); err != nil {
		return fmt.Errorf("failed to start opencode api process: %w", err)
	}

	a.opencodeProcess = cmd
	a.logger.Infof("started opencode api process (pid=%d) in %s", cmd.Process.Pid, cwd)
	return nil
}

func isTCPPortOpen(address string, timeout time.Duration) bool {
	conn, err := net.DialTimeout("tcp", address, timeout)
	if err != nil {
		return false
	}
	_ = conn.Close()
	return true
}

// Shutdown is called when the app is shutting down.
func (a *App) shutdown(ctx context.Context) {
	a.logger.Info("Shutting down application.")
	if a.streamClient != nil {
		a.streamClient.Stop()
	}
	if a.opencodeProcess != nil && a.opencodeProcess.Process != nil {
		if err := a.opencodeProcess.Process.Kill(); err != nil {
			a.logger.Warnf("failed to stop opencode api process: %v", err)
		}
		_, _ = a.opencodeProcess.Process.Wait()
		a.opencodeProcess = nil
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

// UpdateConfigModel updates the server default model configuration.
func (a *App) UpdateConfigModel(model string) error {
	return a.configService.UpdateConfigModel(model)
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

// SummarizeSession summarizes a session (generates session title/summary).
func (a *App) SummarizeSession(sessionID string, providerID string, modelID string) error {
	return a.sessionService.SummarizeSession(sessionID, providerID, modelID)
}

// SummarizeSessionTitle generates a one-line session summary and updates the session title.
func (a *App) SummarizeSessionTitle(sessionID string) (string, error) {
	messages, err := a.messageService.GetMessages(sessionID)
	if err != nil {
		return "", fmt.Errorf("failed to get messages: %w", err)
	}

	source := buildSessionSummarySource(messages)
	if source == "" {
		return "", fmt.Errorf("no message content available to summarize")
	}

	title := ""

	// Prefer LLM-based title generation when configured.
	if a.llmClient != nil {
		appConfig, cfgErr := a.appConfigService.GetAppConfig()
		if cfgErr == nil && appConfig.LLM.Model != "" {
			req := &models.PolishTextRequest{
				Text: source,
				Prompt: "以下の会話内容から、セッションタイトルを1行で生成してください。\n" +
					"条件:\n" +
					"- 30文字以内\n" +
					"- 改行しない\n" +
					"- 余計な引用符や記号を付けない\n" +
					"- 内容を端的に表す\n\n" +
					"会話:\n{text}",
				Model: appConfig.LLM.Model,
			}
			resp, llmErr := a.llmClient.PolishText(req)
			if llmErr == nil && resp != nil {
				title = sanitizeSingleLineTitle(resp.PolishedText)
			}
		}
	}

	// Fallback when LLM is unavailable/unconfigured/failed.
	if title == "" {
		title = sanitizeSingleLineTitle(source)
	}
	if title == "" {
		return "", fmt.Errorf("failed to generate session title")
	}

	if _, err := a.sessionService.UpdateSession(sessionID, title); err != nil {
		return "", fmt.Errorf("failed to update session title: %w", err)
	}

	return title, nil
}

func buildSessionSummarySource(messages []models.MessageWithParts) string {
	lines := make([]string, 0, 12)
	for i := len(messages) - 1; i >= 0 && len(lines) < 12; i-- {
		msg := messages[i]
		role := ""
		if msg.Info != nil {
			role = msg.Info.GetRole()
		}
		for _, part := range msg.Parts {
			textPart, ok := part.(models.TextPart)
			if !ok {
				continue
			}
			text := strings.TrimSpace(textPart.Text)
			if text == "" {
				continue
			}
			text = strings.Join(strings.Fields(text), " ")
			if len(text) > 140 {
				text = text[:140]
			}
			if role != "" {
				lines = append([]string{fmt.Sprintf("%s: %s", role, text)}, lines...)
			} else {
				lines = append([]string{text}, lines...)
			}
			if len(lines) >= 12 {
				break
			}
		}
	}
	return strings.TrimSpace(strings.Join(lines, "\n"))
}

func sanitizeSingleLineTitle(input string) string {
	s := strings.TrimSpace(input)
	s = strings.ReplaceAll(s, "\r", " ")
	s = strings.ReplaceAll(s, "\n", " ")
	s = strings.Trim(s, "\"'` ")
	s = strings.Join(strings.Fields(s), " ")
	if s == "" {
		return ""
	}
	runes := []rune(s)
	if len(runes) > 30 {
		s = string(runes[:30])
	}
	return strings.TrimSpace(s)
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

// StopMessage stops the current agent execution in a session.
func (a *App) StopMessage(sessionID string) error {
	return a.messageService.StopMessage(sessionID)
}

// RespondPermission responds to a pending permission/question request in a session.
func (a *App) RespondPermission(sessionID string, permissionID string, response string) error {
	return a.messageService.RespondPermission(sessionID, permissionID, response)
}

// SendTUIControlResponse sends a response body for interactive TUI control requests.
func (a *App) SendTUIControlResponse(body interface{}) error {
	return a.messageService.SendTUIControlResponse(body)
}

// GetSessionTokens returns token usage information for a session.
func (a *App) GetSessionTokens(sessionID string) (*models.SessionTokens, error) {
	// Get all messages for the session
	messages, err := a.messageService.GetMessages(sessionID)
	if err != nil {
		return nil, fmt.Errorf("failed to get messages: %w", err)
	}

	// Calculate total tokens used
	totalInput := 0
	totalOutput := 0
	var lastModelID, lastProviderID string

	for _, msg := range messages {
		if assistantMsg, ok := msg.Info.(models.AssistantMessage); ok {
			totalInput += assistantMsg.Tokens.Input
			totalOutput += assistantMsg.Tokens.Output
			lastModelID = assistantMsg.ModelID
			lastProviderID = assistantMsg.ProviderID
		}
	}

	totalUsed := totalInput + totalOutput

	// Get provider information to find context limit
	providersResp, err := a.configService.GetProviders()
	if err != nil {
		return nil, fmt.Errorf("failed to get providers: %w", err)
	}

	// Find the model's context limit
	var contextLimit int
	for _, provider := range providersResp.Providers {
		if provider.ID == lastProviderID {
			if model, ok := provider.Models[lastModelID]; ok {
				contextLimit = model.Limit.Context
				break
			}
		}
	}

	// Calculate percentage
	var percentage float64
	if contextLimit > 0 {
		percentage = (float64(totalUsed) / float64(contextLimit)) * 100
	}

	return &models.SessionTokens{
		Used:       totalUsed,
		Max:        contextLimit,
		Percentage: percentage,
		ModelID:    lastModelID,
		ProviderID: lastProviderID,
	}, nil
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
