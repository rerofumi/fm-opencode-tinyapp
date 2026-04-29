package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sync"

	"fm-opencode-tinyapp/internal/models"
)

type eventBroker struct {
	mu      sync.Mutex
	clients map[chan models.ServerEvent]struct{}
}

func newEventBroker() *eventBroker {
	return &eventBroker{clients: make(map[chan models.ServerEvent]struct{})}
}

func (b *eventBroker) Emit(event models.ServerEvent) {
	b.mu.Lock()
	defer b.mu.Unlock()
	for ch := range b.clients {
		select {
		case ch <- event:
		default:
		}
	}
}

func (b *eventBroker) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "streaming unsupported", http.StatusInternalServerError)
		return
	}

	ch := make(chan models.ServerEvent, 16)
	b.mu.Lock()
	b.clients[ch] = struct{}{}
	b.mu.Unlock()
	defer func() {
		b.mu.Lock()
		delete(b.clients, ch)
		b.mu.Unlock()
		close(ch)
	}()

	ctx := r.Context()
	for {
		select {
		case <-ctx.Done():
			return
		case event := <-ch:
			payload, _ := json.Marshal(event)
			_, _ = fmt.Fprintf(w, "event: server-event\ndata: %s\n\n", payload)
			flusher.Flush()
		}
	}
}
