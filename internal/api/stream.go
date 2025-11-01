package api

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"fm-opencode-tinyapp/internal/models"
	"strings"
	"time"

	"github.com/sirupsen/logrus"
)

// StreamClient handles the SSE connection to the OpenCode API.
type StreamClient struct {
	BaseURL    string
	HTTPClient *http.Client
	logger     *logrus.Logger
	eventChan  chan *models.Event
	stopChan   chan struct{}
}

// NewStreamClient creates a new StreamClient.
func NewStreamClient(baseURL string, logger *logrus.Logger) *StreamClient {
	return &StreamClient{
		BaseURL:    baseURL,
		HTTPClient: &http.Client{},
		logger:     logger,
		eventChan:  make(chan *models.Event, 100),
		stopChan:   make(chan struct{}),
	}
}

// SubscribeEvents connects to the /event endpoint and starts listening for SSE events.
// It runs in a goroutine and will attempt to reconnect on failure.
func (c *StreamClient) SubscribeEvents(ctx context.Context) (<-chan *models.Event, error) {
	go c.startEventStream(ctx)
	return c.eventChan, nil
}

func (c *StreamClient) startEventStream(ctx context.Context) {
	defer close(c.eventChan)

	for {
		select {
		case <-ctx.Done():
			c.logger.Info("Context cancelled, stopping event stream.")
			return
		case <-c.stopChan:
			c.logger.Info("Stopping event stream.")
			return
		default:
			err := c.connectAndStream(ctx)
			if err != nil {
				c.logger.Errorf("Event stream error: %v. Reconnecting in 5 seconds...", err)
				time.Sleep(5 * time.Second)
			}
		}
	}
}

func (c *StreamClient) connectAndStream(ctx context.Context) error {
	req, err := http.NewRequestWithContext(ctx, "GET", c.BaseURL+"/event", nil)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Accept", "text/event-stream")
	req.Header.Set("Cache-Control", "no-cache")
	req.Header.Set("Connection", "keep-alive")

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to connect to event stream: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}

	c.logger.Info("Successfully connected to event stream.")

	scanner := bufio.NewScanner(resp.Body)
	for scanner.Scan() {
		line := scanner.Text()
		if strings.HasPrefix(line, "data:") {
			data := strings.TrimSpace(strings.TrimPrefix(line, "data:"))
			var event models.Event
			if err := json.Unmarshal([]byte(data), &event); err != nil {
				c.logger.Warnf("Failed to unmarshal event data: %v, data: %s", err, data)
				continue
			}
			c.eventChan <- &event
		}
	}

	if err := scanner.Err(); err != nil {
		return fmt.Errorf("scanner error: %w", err)
	}

	return fmt.Errorf("event stream disconnected")
}

// Stop gracefully stops the event stream.
func (c *StreamClient) Stop() {
	close(c.stopChan)
}
