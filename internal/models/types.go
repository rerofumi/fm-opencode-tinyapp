package models

// AppInfo defines the structure for the application info.
type AppInfo struct {
	// Define fields based on GET /app response
}

// SearchResultPath defines the path of a search result.
type SearchResultPath struct {
	Text string `json:"text"`
}

// SearchResultLines defines the lines of a search result.
type SearchResultLines struct {
	Text string `json:"text"`
}

// SearchResult defines the structure for a search result.
type SearchResult struct {
	Path       SearchResultPath  `json:"path"`
	Lines      SearchResultLines `json:"lines"`
	LineNumber int               `json:"line_number"`
}

// SymbolLocation defines the location of a symbol.
type SymbolLocation struct {
	URI   string `json:"uri"`
	Range Range  `json:"range"`
}

// Symbol defines the structure for a symbol.
type Symbol struct {
	Name     string         `json:"name"`
	Kind     string         `json:"kind"`
	Location SymbolLocation `json:"location"`
}

// Range defines the structure for a range.
type Range struct {
	Start Position `json:"start"`
	End   Position `json:"end"`
}

// Position defines the structure for a position.
type Position struct {
	Line      int `json:"line"`
	Character int `json:"character"`
}

// FileContent defines the structure for a file's content.
type FileContent struct {
	Content string  `json:"content"`
	Diff    *string `json:"diff,omitempty"`
	Patch   *string `json:"patch,omitempty"`
}

// File defines the structure for a file's status.
type File struct {
	Path    string `json:"path"`
	Added   bool   `json:"added"`
	Removed bool   `json:"removed"`
	Status  string `json:"status"`
}


// LogEntry defines the structure for a log entry.
type LogEntry struct {
	Service string      `json:"service"`
	Level   string      `json:"level"`
	Message string      `json:"message"`
	Extra   interface{} `json:"extra,omitempty"`
}

