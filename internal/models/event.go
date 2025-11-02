package models

// Event defines the structure for a server-sent event from the OpenCode API.
// Based on the OpenCode API specification, events have a type and properties.
type Event struct {
	Type       string                 `json:"type"`
	Properties map[string]interface{} `json:"properties"`
}

// MessagePartUpdatedEvent represents a message.part.updated event
type MessagePartUpdatedEvent struct {
	Type       string `json:"type"`
	Properties struct {
		Part  map[string]interface{} `json:"part"`
		Delta *string                `json:"delta,omitempty"`
	} `json:"properties"`
}

// MessageUpdatedEvent represents a message.updated event
type MessageUpdatedEvent struct {
	Type       string `json:"type"`
	Properties struct {
		Info map[string]interface{} `json:"info"`
	} `json:"properties"`
}
