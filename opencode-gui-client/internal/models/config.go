package models

// AppConfig defines the structure for the application's local configuration.
type AppConfig struct {
	ServerURL string `json:"serverURL"`
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
