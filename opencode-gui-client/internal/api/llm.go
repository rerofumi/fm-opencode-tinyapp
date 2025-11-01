package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"opencode-gui-client/internal/models"
)

// LLMClient handles LLM API requests.
type LLMClient struct {
	baseURL string
	apiKey  string
	client  *http.Client
}

// NewLLMClient creates a new LLM client.
func NewLLMClient(baseURL, apiKey string) *LLMClient {
	return &LLMClient{
		baseURL: baseURL,
		apiKey:  apiKey,
		client: &http.Client{
			Timeout: 60 * time.Second,
		},
	}
}

// ChatRequest represents a chat completion request.
type ChatRequest struct {
	Model    string    `json:"model"`
	Messages []Message `json:"messages"`
}

// Message represents a chat message.
type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// ChatResponse represents a chat completion response.
type ChatResponse struct {
	Choices []Choice `json:"choices"`
}

// Choice represents a choice in the response.
type Choice struct {
	Message Message `json:"message"`
}

// PolishText sends text to LLM for polishing.
func (c *LLMClient) PolishText(req *models.PolishTextRequest) (*models.PolishTextResponse, error) {
	// Replace {text} placeholder in the prompt with the actual text
	prompt := req.Prompt
	if prompt == "" {
		prompt = "以下の文章をより自然で分かりやすく、丁寧な表現に修正してください。\n誤字脱字や文法的な誤りも修正してください。\n\n---\n{text}"
	}

	// Replace {text} placeholder
	prompt = strings.ReplaceAll(prompt, "{text}", req.Text)

	// Prepare the request
	messages := []Message{
		{
			Role:    "user",
			Content: prompt,
		},
	}

	chatReq := ChatRequest{
		Model:    req.Model,
		Messages: messages,
	}

	jsonData, err := json.Marshal(chatReq)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	// Create request
	httpReq, err := http.NewRequest("POST", c.baseURL+"/chat/completions", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Set headers
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+c.apiKey)

	// Send request
	resp, err := c.client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	// Read response
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	// Check for HTTP errors
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API request failed with status %d: %s", resp.StatusCode, string(body))
	}

	// Parse response
	var chatResp ChatResponse
	if err := json.Unmarshal(body, &chatResp); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	if len(chatResp.Choices) == 0 {
		return nil, fmt.Errorf("no choices in response")
	}

	return &models.PolishTextResponse{
		PolishedText: chatResp.Choices[0].Message.Content,
	}, nil
}