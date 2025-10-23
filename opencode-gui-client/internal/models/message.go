package models

import (
	"encoding/json"
	"fmt"
)

// Message interface for different message types
type Message interface {
	GetID() string
	GetSessionID() string
	GetRole() string
}

type baseMessage struct {
	ID        string `json:"id"`
	SessionID string `json:"sessionID"`
	Role      string `json:"role"`
}

// UserMessage represents a message from the user.
type UserMessage struct {
	baseMessage
	Time struct {
		Created int64 `json:"created"`
	} `json:"time"`
}

func (m UserMessage) GetID() string        { return m.ID }
func (m UserMessage) GetSessionID() string { return m.SessionID }
func (m UserMessage) GetRole() string      { return m.Role }

// AssistantMessage represents a message from the assistant.
type AssistantMessage struct {
	baseMessage
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
	Info  Message `json:"info"`
	Parts []Part  `json:"parts"`
}

// UnmarshalJSON for MessageWithParts to handle polymorphic Info and Parts
func (m *MessageWithParts) UnmarshalJSON(data []byte) error {
	type Alias MessageWithParts
	aux := &struct {
		Info  json.RawMessage `json:"info"`
		Parts []json.RawMessage `json:"parts"`
		*Alias
	}{
		Alias: (*Alias)(m),
	}
	if err := json.Unmarshal(data, &aux); err != nil {
		return err
	}

	// Unmarshal Info
	var base baseMessage
	if err := json.Unmarshal(aux.Info, &base); err != nil {
		return err
	}
	switch base.Role {
	case "user":
		var userMsg UserMessage
		if err := json.Unmarshal(aux.Info, &userMsg); err != nil {
			return err
		}
		m.Info = userMsg
	case "assistant":
		var assistantMsg AssistantMessage
		if err := json.Unmarshal(aux.Info, &assistantMsg); err != nil {
			return err
		}
		m.Info = assistantMsg
	default:
		return fmt.Errorf("unknown message role: %s", base.Role)
	}

	// Unmarshal Parts
	m.Parts = make([]Part, len(aux.Parts))
	for i, partData := range aux.Parts {
		var basePart basePart
		if err := json.Unmarshal(partData, &basePart); err != nil {
			return err
		}
		switch basePart.Type {
		case "text":
			var textPart TextPart
			if err := json.Unmarshal(partData, &textPart); err != nil {
				return err
			}
			m.Parts[i] = textPart
		case "tool":
			var toolPart ToolPart
			if err := json.Unmarshal(partData, &toolPart); err != nil {
				return err
			}
			m.Parts[i] = toolPart
		// Add other part types here
		default:
			return fmt.Errorf("unknown part type: %s", basePart.Type)
		}
	}

	return nil
}


// Part interface for different part types
type Part interface {
	GetType() string
}

type basePart struct {
	ID   string `json:"id"`
	Type string `json:"type"`
}

// TextPart represents a text part of a message.
type TextPart struct {
	basePart
	Text string `json:"text"`
}

func (p TextPart) GetType() string { return p.Type }

// ToolPart represents a tool part of a message.
type ToolPart struct {
	basePart
	Tool  string `json:"tool"`
	State string `json:"state"` // "running", "completed", "error"
}

func (p ToolPart) GetType() string { return p.Type }


// PartInput is used for sending message parts.
type PartInput interface {
    GetInputType() string
}

type TextInputPart struct {
    Type string `json:"type"` // "text"
    Text string `json:"text"`
}

func (p TextInputPart) GetInputType() string { return p.Type }

// ModelSelection defines the model to use for a chat message.
type ModelSelection struct {
	ProviderID string `json:"providerID"`
	ModelID    string `json:"modelID"`
}

// ChatInput represents the input for a chat message.
type ChatInput struct {
	Parts []PartInput     `json:"parts"`
	Model *ModelSelection `json:"model,omitempty"`
}

// CommandInput represents the input for a command.
type CommandInput struct {
	Agent   string `json:"agent"`
	Command string `json:"command"`
}
