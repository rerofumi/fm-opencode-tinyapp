package models

// Event defines the structure for a server-sent event from the OpenCode API.
type Event struct {
	SessionID string      `json:"sessionID"`
	MessageID string      `json:"messageID"`
	PartID    string      `json:"partID"`
	Data      interface{} `json:"data"` // Can be TextPart, ToolPart, etc.
}
