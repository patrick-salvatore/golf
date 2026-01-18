package models

import (
	"database/sql"
	"time"
)

type TournamentFormat struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description,omitempty"`
}

type Player struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Handicap  float64   `json:"handicap"`
	IsAdmin   bool      `json:"isAdmin,omitempty"`
	Tee       string    `json:"tee,omitempty"` // Used for request inputs
	CreatedAt time.Time `json:"createdAt"`
}

type Course struct {
	ID   string         `json:"id"`
	Name string         `json:"name"`
	Data sql.NullString `json:"-"` // Raw JSON from DB
	Meta CourseMeta     `json:"meta"`
}

type CourseMeta struct {
	Holes []HoleData `json:"holes"`
	Tees  []string   `json:"tees"`
}

type HoleData struct {
	Number   int `json:"number"`
	Par      int `json:"par"`
	Handicap int `json:"handicap"`
}

type Tournament struct {
	ID              string  `json:"id"`
	Name            string  `json:"name"`
	CourseID        string  `json:"courseId"`
	FormatID        string  `json:"formatId"`
	TeamCount       int     `json:"teamCount"`
	AwardedHandicap float64 `json:"awardedHandicap"`
	IsMatchPlay     bool    `json:"isMatchPlay"`
	Complete        bool    `json:"complete"`
	StartTime       string  `json:"startTime,omitempty"` // New field
	CreatedAt       string  `json:"created"`
}

type CreateTournamentRequest struct {
	Name            string   `json:"name"`
	CourseID        string   `json:"courseId"`
	FormatID        string   `json:"formatId"`
	TeamCount       int      `json:"teamCount"`
	AwardedHandicap float64  `json:"awardedHandicap"`
	IsMatchPlay     bool     `json:"isMatchPlay"`
	StartTime       string   `json:"startTime,omitempty"` // New field
	Players         []Player `json:"players"`
}

type Team struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	TournamentID string `json:"tournamentId"`
	Started      bool   `json:"started"`
	Finished     bool   `json:"finished"`
}

type Invite struct {
	Token        string `json:"token"`
	TournamentID string `json:"tournamentId"`
	TeamID       string `json:"teamId,omitempty"` // Optional
	ExpiresAt    string `json:"expiresAt"`
	CreatedAt    string `json:"createdAt"`
}

type CreateInviteRequest struct {
	TournamentID string `json:"tournamentId"`
	TeamID       string `json:"teamId,omitempty"`
}

// -- Sync Engine Models --

type Entity struct {
	Namespace string `json:"namespace"`
	Type      string `json:"type"`
	ID        string `json:"id"`
	Data      any    `json:"data"` // JSON
	UpdatedAt int64  `json:"updatedAt"`
	UpdatedBy string `json:"updatedBy"`
}

type ChangelogEntry struct {
	Namespace  string `json:"namespace"`
	Version    int64  `json:"version"`
	ClientID   string `json:"clientId"`
	EntityType string `json:"entityType"`
	EntityID   string `json:"entityId"`
	Op         string `json:"op"` // 'upsert' | 'delete'
	Data       any    `json:"data,omitempty"`
}

type MutationOp struct {
	Op            string `json:"op"` // 'upsert' | 'delete'
	Type          string `json:"type"`
	ID            string `json:"id"`
	Data          any    `json:"data,omitempty"`
	BaseUpdatedAt int64  `json:"baseUpdatedAt,omitempty"` // For conflict detection
}

type MutateRequest struct {
	ClientID  string       `json:"clientId"`
	Mutations []MutationOp `json:"mutations"`
}

type SyncResponse struct {
	Version int64            `json:"version"`
	Changes []ChangelogEntry `json:"changes"`
}
