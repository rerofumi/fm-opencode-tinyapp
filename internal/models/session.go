package models

// Time defines the structure for time data.
type Time struct {
	Created int64 `json:"created"`
	Updated int64 `json:"updated"`
}

// Share defines the structure for share data.
type Share struct {
	URL string `json:"url"`
}

// Session defines the structure for a session.
type Session struct {
	ID        string  `json:"id"`
	ProjectID string  `json:"projectID"`
	Title     string  `json:"title"`
	ParentID  *string `json:"parentID,omitempty"`
	Time      Time    `json:"time"`
	Share     *Share  `json:"share,omitempty"`
}
