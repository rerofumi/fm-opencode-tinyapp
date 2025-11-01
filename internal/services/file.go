package services

import (
	"fm-opencode-tinyapp/internal/api"
	"fm-opencode-tinyapp/internal/models"
)

// FileService handles business logic for files.
type FileService struct {
	apiClient *api.Client
}

// NewFileService creates a new FileService.
func NewFileService(apiClient *api.Client) *FileService {
	return &FileService{apiClient: apiClient}
}

// FindInFiles searches for a pattern in files.
func (s *FileService) FindInFiles(pattern string) ([]models.SearchResult, error) {
	return s.apiClient.FindInFiles(pattern)
}

// FindFiles finds files by a query.
func (s *FileService) FindFiles(query string) ([]string, error) {
	return s.apiClient.FindFiles(query)
}

// FindSymbols finds symbols by a query.
func (s *FileService) FindSymbols(query string) ([]models.Symbol, error) {
	return s.apiClient.FindSymbols(query)
}

// ReadFile reads the content of a file.
func (s *FileService) ReadFile(path string) (*models.FileContent, error) {
	return s.apiClient.ReadFile(path)
}
