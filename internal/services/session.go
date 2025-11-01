package services

import (
	"fm-opencode-tinyapp/internal/api"
	"fm-opencode-tinyapp/internal/models"
)

// SessionService handles business logic for sessions.
type SessionService struct {
	apiClient *api.Client
}

// NewSessionService creates a new SessionService.
func NewSessionService(apiClient *api.Client) *SessionService {
	return &SessionService{apiClient: apiClient}
}

// GetSessions retrieves all sessions.
func (s *SessionService) GetSessions() ([]models.Session, error) {
	return s.apiClient.GetSessions()
}

// GetSession retrieves a single session by its ID.
func (s *SessionService) GetSession(id string) (*models.Session, error) {
	return s.apiClient.GetSession(id)
}

// CreateSession creates a new session.
func (s *SessionService) CreateSession(title string) (*models.Session, error) {
	if title == "" {
		title = "New Session"
	}
	return s.apiClient.CreateSession(title)
}

// UpdateSession updates a session's title.
func (s *SessionService) UpdateSession(id, title string) (*models.Session, error) {
	return s.apiClient.UpdateSession(id, title)
}

// DeleteSession deletes a session.
func (s *SessionService) DeleteSession(id string) error {
	return s.apiClient.DeleteSession(id)
}
