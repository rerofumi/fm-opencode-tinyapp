package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"fm-opencode-tinyapp/internal/models"
	"time"
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

// doRequest is a helper function to make HTTP requests.
func (c *Client) doRequest(method, path string, query url.Values, body interface{}) (*http.Response, error) {
	var reqBody io.Reader
	if body != nil {
		jsonBody, err := json.Marshal(body)
		if err != nil {
			return nil, err
		}
		reqBody = bytes.NewBuffer(jsonBody)
	}

	fullURL := fmt.Sprintf("%s%s", c.BaseURL, path)
	if query != nil {
		fullURL = fmt.Sprintf("%s?%s", fullURL, query.Encode())
	}

	req, err := http.NewRequest(method, fullURL, reqBody)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	res, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, err
	}

	return res, nil
}

// decodeResponse is a helper function to decode JSON responses.
func decodeResponse(res *http.Response, target interface{}) error {
	defer res.Body.Close()
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		body, _ := io.ReadAll(res.Body) // エラーレスポンスのボディを読み取る
		return fmt.Errorf("unexpected status code: %d, response body: %s", res.StatusCode, string(body))
	}
	
	return json.NewDecoder(res.Body).Decode(target)
}

// GetSessions fetches all sessions from the server.
func (c *Client) GetSessions() ([]models.Session, error) {
	res, err := c.doRequest("GET", "/session", nil, nil)
	if err != nil {
		return nil, err
	}
	var sessions []models.Session
	err = decodeResponse(res, &sessions)
	return sessions, err
}

// GetSession fetches a single session by its ID.
func (c *Client) GetSession(id string) (*models.Session, error) {
	res, err := c.doRequest("GET", fmt.Sprintf("/session/%s", id), nil, nil)
	if err != nil {
		return nil, err
	}
	var session models.Session
	err = decodeResponse(res, &session)
	return &session, err
}

// CreateSession creates a new session.
func (c *Client) CreateSession(title string) (*models.Session, error) {
	body := map[string]string{"title": title}
	res, err := c.doRequest("POST", "/session", nil, body)
	if err != nil {
		return nil, err
	}
	var session models.Session
	err = decodeResponse(res, &session)
	return &session, err
}

// UpdateSession updates a session's title.
func (c *Client) UpdateSession(id, title string) (*models.Session, error) {
	body := map[string]string{"title": title}
	res, err := c.doRequest("PATCH", fmt.Sprintf("/session/%s", id), nil, body)
	if err != nil {
		return nil, err
	}
	var session models.Session
	err = decodeResponse(res, &session)
	return &session, err
}

// DeleteSession deletes a session by its ID.
func (c *Client) DeleteSession(id string) error {
	res, err := c.doRequest("DELETE", fmt.Sprintf("/session/%s", id), nil, nil)
	if err != nil {
		return err
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK && res.StatusCode != http.StatusNoContent {
		return fmt.Errorf("unexpected status code: %d", res.StatusCode)
	}
	return nil
}

// GetMessages fetches all messages for a given session.
func (c *Client) GetMessages(sessionID string) ([]models.MessageWithParts, error) {
	res, err := c.doRequest("GET", fmt.Sprintf("/session/%s/message", sessionID), nil, nil)
	if err != nil {
		return nil, err
	}
	var messages []models.MessageWithParts
	err = decodeResponse(res, &messages)
	return messages, err
}

// SendMessage sends a new message to a session.
func (c *Client) SendMessage(sessionID string, req *models.ChatInput) (*models.MessageWithParts, error) {
	res, err := c.doRequest("POST", fmt.Sprintf("/session/%s/message", sessionID), nil, req)
	if err != nil {
		return nil, err
	}
	var message models.MessageWithParts
	err = decodeResponse(res, &message)
	return &message, err
}

// GetAgents fetches the list of available agents.
func (c *Client) GetAgents() ([]models.Agent, error) {
	res, err := c.doRequest("GET", "/agent", nil, nil)
	if err != nil {
		return nil, err
	}
	var agents []models.Agent
	err = decodeResponse(res, &agents)
	return agents, err
}

// GetConfig fetches the server configuration.
func (c *Client) GetConfig() (*models.ServerConfig, error) {
	res, err := c.doRequest("GET", "/config", nil, nil)
	if err != nil {
		return nil, err
	}
	var config models.ServerConfig
	err = decodeResponse(res, &config)
	return &config, err
}

// FindInFiles searches for a pattern in files.
func (c *Client) FindInFiles(pattern string) ([]models.SearchResult, error) {
	query := url.Values{}
	query.Add("pattern", pattern)
	res, err := c.doRequest("GET", "/find", query, nil)
	if err != nil {
		return nil, err
	}
	var results []models.SearchResult
	err = decodeResponse(res, &results)
	return results, err
}

// FindFiles finds files by a query.
func (c *Client) FindFiles(queryStr string) ([]string, error) {
	query := url.Values{}
	query.Add("query", queryStr)
	res, err := c.doRequest("GET", "/find/file", query, nil)
	if err != nil {
		return nil, err
	}
	var files []string
	err = decodeResponse(res, &files)
	return files, err
}

// FindSymbols finds symbols by a query.
func (c *Client) FindSymbols(queryStr string) ([]models.Symbol, error) {
	query := url.Values{}
	query.Add("query", queryStr)
	res, err := c.doRequest("GET", "/find/symbol", query, nil)
	if err != nil {
		return nil, err
	}
	var symbols []models.Symbol
	err = decodeResponse(res, &symbols)
	return symbols, err
}

// ReadFile reads the content of a file.
func (c *Client) ReadFile(path string) (*models.FileContent, error) {
	query := url.Values{}
	query.Add("path", path)
	res, err := c.doRequest("GET", "/file/content", query, nil)
	if err != nil {
		return nil, err
	}
	var content models.FileContent
	err = decodeResponse(res, &content)
	return &content, err
}

// GetProviders fetches the list of available providers and models.
func (c *Client) GetProviders() (*models.ProvidersResponse, error) {
	res, err := c.doRequest("GET", "/config/providers", nil, nil)
	if err != nil {
		return nil, err
	}
	var providersResponse models.ProvidersResponse
	err = decodeResponse(res, &providersResponse)
	return &providersResponse, err
}
