package models

// AppConfig defines the structure for the application's local configuration.
type AppConfig struct {
	ServerURL string `json:"serverURL"`
	LLM       LLMConfig `json:"llm,omitempty"`
}

// LLMConfig defines the structure for LLM configuration.
type LLMConfig struct {
	Provider  string `json:"provider,omitempty"`
	BaseURL   string `json:"baseURL,omitempty"`
	APIKey    string `json:"apiKey,omitempty"`
	Model     string `json:"model,omitempty"`
	Prompt    string `json:"prompt,omitempty"`
}

// ServerConfig defines the structure for the server's configuration.
type ServerConfig struct {
	Theme    string                `json:"theme,omitempty"`
	Model    string                `json:"model,omitempty"`
	Agent    map[string]AgentConfig `json:"agent,omitempty"`
	Provider map[string]interface{} `json:"provider,omitempty"`
	Keybinds interface{}           `json:"keybinds,omitempty"`
}

// AgentConfig defines the structure for an agent's configuration.
type AgentConfig struct {
	Model       string          `json:"model,omitempty"`
	Temperature float64         `json:"temperature,omitempty"`
	Prompt      string          `json:"prompt,omitempty"`
	Tools       map[string]bool `json:"tools,omitempty"`
}

// Agent represents an agent.
type Agent struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

// ProvidersResponse defines the structure for the providers response.
type ProvidersResponse struct {
	Providers []Provider `json:"providers"`
	Default   struct {
		ID    string `json:"id"`
		Model string `json:"model"`
	} `json:"default"`
}

// Provider defines the structure for a provider.
type Provider struct {
	ID     string           `json:"id"`
	Name   string           `json:"name"`
	Models map[string]Model `json:"models"`
}

// Model defines the structure for a model.
type Model struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Limit struct {
		Context int `json:"context"`
		Output  int `json:"output"`
	} `json:"limit"`
}

// PolishTextRequest represents a request to polish text.
type PolishTextRequest struct {
	Text   string `json:"text"`
	Prompt string `json:"prompt"`
	Model  string `json:"model"`
}

// PolishTextResponse represents a response from polishing text.
type PolishTextResponse struct {
	PolishedText string `json:"polishedText"`
}
