package services

import (
	"fm-opencode-tinyapp/internal/api"
	"fm-opencode-tinyapp/internal/models"
)

// MessageService handles business logic for messages.
type MessageService struct {
	apiClient *api.Client
}

// NewMessageService creates a new MessageService.
func NewMessageService(apiClient *api.Client) *MessageService {
	return &MessageService{apiClient: apiClient}
}

// GetMessages retrieves all messages for a session.
func (s *MessageService) GetMessages(sessionID string) ([]models.MessageWithParts, error) {
	return s.apiClient.GetMessages(sessionID)
}

// SendMessage sends a new message.
func (s *MessageService) SendMessage(sessionID string, req *models.ChatInput) (*models.MessageWithParts, error) {
	return s.apiClient.SendMessage(sessionID, req)
}

// StopMessage stops the current agent execution in a session.
func (s *MessageService) StopMessage(sessionID string) error {
	return s.apiClient.StopMessage(sessionID)
}
