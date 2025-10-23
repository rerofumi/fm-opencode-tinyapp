package models

import "encoding/json"

// Message interface for different message types
type Message interface {
	GetID() string
	GetSessionID() string
	GetRole() string
}

// UserMessage represents a message from the user.
type UserMessage struct {
	ID        string `json:"id"`
	SessionID string `json:"sessionID"`
	Role      string `json:"role"` // "user"
	Time      struct {
		Created int64 `json:"created"`
	} `json:"time"`
}

func (m UserMessage) GetID() string        { return m.ID }
func (m UserMessage) GetSessionID() string { return m.SessionID }
func (m UserMessage) GetRole() string      { return m.Role }

// AssistantMessage represents a message from the assistant.
type AssistantMessage struct {
	ID         string `json:"id"`
	SessionID  string `json:"sessionID"`
	Role       string `json:"role"` // "assistant"
	ModelID    string `json:"modelID"`
	ProviderID string `json:"providerID"`
	Time       struct {
		Created   int64 `json:"created"`
		Completed int64 `json:"completed,omitempty"`
	} `json:"time"`
}

func (m AssistantMessage) GetID() string        { return m.ID }
func (m AssistantMessage) GetSessionID() string { return m.SessionID }
func (m AssistantMessage) GetRole() string      { return m.Role }

// MessageWithParts is a struct that holds a message and its parts.
type MessageWithParts struct {
	Info  json.RawMessage `json:"info"`
	Parts []json.RawMessage  `json:"parts"`
}

// Part interface for different part types
type Part interface {
	GetType() string
}

// TextPart represents a text part of a message.
type TextPart struct {
	ID   string `json:"id"`
	Type string `json:"type"` // "text"
	Text string `json:"text"`
}

func (p TextPart) GetType() string { return p.Type }

// ToolPart represents a tool part of a message.
type ToolPart struct {
	ID    string `json:"id"`
	Type  string `json:"type"` // "tool"
	Tool  string `json:"tool"`
	State string `json:"state"` // "running", "completed", "error"
}

func (p ToolPart) GetType() string { return p.Type }

// ChatInput represents the input for a chat message.
type ChatInput struct {
	Parts []Part `json:"parts"`
	Model *struct {
		ProviderID string `json:"providerID"`
		ModelID    string `json:"modelID"`
	} `json:"model,omitempty"`
}

// CommandInput represents the input for a command.
type CommandInput struct {
	Agent   string `json:"agent"`
	Command string `json:"command"`
}
