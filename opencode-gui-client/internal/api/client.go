package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"
	"opencode-gui-client/internal/models"
)

// Client is a client for the OpenCode API.
type Client struct {
	BaseURL    string
	HTTPClient *http.Client
}

// NewClient creates a new OpenCode API client.
func NewClient(baseURL string) *Client {
	return &Client{
		BaseURL: baseURL,
		HTTPClient: &http.Client{
			Timeout: time.Minute,
		},
	}
}

// GetSessions fetches all sessions from the server.
func (c *Client) GetSessions() ([]models.Session, error) {
	req, err := http.NewRequest("GET", fmt.Sprintf("%s/session", c.BaseURL), nil)
	if err != nil {
		return nil, err
	}

	res, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected status code: %d", res.StatusCode)
	}

	var sessions []models.Session
	if err := json.NewDecoder(res.Body).Decode(&sessions); err != nil {
		return nil, err
	}

	return sessions, nil
}

// GetConfig fetches the server configuration.
func (c *Client) GetConfig() (*models.ServerConfig, error) {
	req, err := http.NewRequest("GET", fmt.Sprintf("%s/config", c.BaseURL), nil)
	if err != nil {
		return nil, err
	}

	res, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected status code: %d", res.StatusCode)
	}

	var config models.ServerConfig
	if err := json.NewDecoder(res.Body).Decode(&config); err != nil {
		return nil, err
	}

	return &config, nil
}
