package models

import (
	"database/sql"
	"time"
)

type TournamentFormat struct {
	ID            int    `json:"id"`
	Name          string `json:"name"`
	Description   string `json:"description,omitempty"`
	IsTeamScoring bool   `json:"isTeamScoring"`
}

type Player struct {
	ID                  int       `json:"id"`
	TournamentID        int       `json:"tournament_id"`
	TeamID              int       `json:"team_id"`
	Name                string    `json:"name"`
	Handicap            float64   `json:"handicap"`
	RefreshTokenVersion int       `json:"refreshTokenVersion"`
	IsAdmin             bool      `json:"isAdmin,omitempty"`
	Active              bool      `json:"active,omitempty"`
	Tee                 int       `json:"tee,omitempty"`
	TeeName             string    `json:"teeName,omitempty"`
	CreatedAt           time.Time `json:"createdAt"`
}

type Course struct {
	ID   int            `json:"id"`
	Name string         `json:"name"`
	Data sql.NullString `json:"-"` // Raw JSON from DB
	Meta CourseMeta     `json:"meta"`
}

type CourseMeta struct {
	Holes []HoleData `json:"holes"`
	Tees  []string   `json:"tees"`
}

type HoleData struct {
	ID              int `json:"id"`
	Number          int `json:"number"`
	Par             int `json:"par"`
	Handicap        int `json:"handicap"`
	RawHandicap     int `json:"rawHandicap"`
	AllowedHandicap int `json:"allowedHandicap"`
	Yardage         int `json:"yardage"`
}

type AvailablePlayer struct {
	PlayerID     int     `json:"playerId"`
	Name         string  `json:"name"`
	Handicap     float32 `json:"handicap"`
	TeamID       int     `json:"teamId"`
	TournamentID int     `json:"tournamentId"`
}

type Tournament struct {
	ID                          int     `json:"id"`
	Name                        string  `json:"name"`
	CourseID                    int     `json:"courseId"`
	FormatID                    int     `json:"formatId"`
	TeamCount                   int     `json:"teamCount"`
	AwardedHandicap             float64 `json:"awardedHandicap"`
	IsMatchPlay                 bool    `json:"isMatchPlay"`
	Complete                    bool    `json:"complete"`
	FormatName                  string  `json:"formatName"`
	IsTeamScoring               bool    `json:"isTeamScoring"`
	TournamentFormatDescription string  `json:"tournamentFormatDescription"`
	StartTime                   string  `json:"startTime,omitempty"` // New field
	CreatedAt                   string  `json:"created"`
}

type CreateTournamentRequest struct {
	Name            string   `json:"name"`
	CourseID        int      `json:"courseId"`
	FormatID        int      `json:"formatId"`
	TeamCount       int      `json:"teamCount"`
	AwardedHandicap float64  `json:"awardedHandicap"`
	IsMatchPlay     bool     `json:"isMatchPlay"`
	StartTime       string   `json:"startTime,omitempty"` // New field
	Players         []Player `json:"players"`
}

type Team struct {
	ID           int    `json:"id"`
	Name         string `json:"name"`
	TournamentID int    `json:"tournamentId"`
}

type Invite struct {
	Token        string `json:"token"`
	TournamentID int    `json:"tournamentId"`
	ExpiresAt    string `json:"expiresAt"`
	CreatedAt    string `json:"createdAt"`
	Active       bool   `json:"active"`
}

type CreateInviteRequest struct {
	TournamentID int `json:"tournamentId"`
	TeamID       int `json:"teamId,omitempty"`
}

type Score struct {
	ID           int    `json:"id"`
	TournamentID int    `json:"tournamentId"`
	PlayerID     *int   `json:"playerId,omitempty"` // Pointer to allow null
	TeamID       *int   `json:"teamId,omitempty"`   // Pointer to allow null
	CourseHoleID int    `json:"courseHoleId"`
	HoleNumber   int    `json:"holeNumber,omitempty"` // Enriched field
	Strokes      int    `json:"strokes"`
	Putts        int    `json:"putts,omitempty"` // Deprecated but might be needed for legacy types? No, removed from DB.
	CreatedAt    string `json:"createdAt"`
}

type SubmitScoreRequest struct {
	TournamentID int  `json:"tournamentId"`
	PlayerID     *int `json:"playerId,omitempty"`
	TeamID       *int `json:"teamId,omitempty"`
	CourseHoleID int  `json:"courseHoleId"`
	Strokes      int  `json:"strokes"`
}

// -- Sync Engine Models --

type Entity struct {
	Namespace int    `json:"namespace"`
	Type      string `json:"type"`
	EntityId  int    `json:"entityId"`
	Data      any    `json:"data"` // JSON
	UpdatedAt int64  `json:"updatedAt"`
	UpdatedBy string `json:"updatedBy"`
}

type ChangelogEntry struct {
	Namespace  int    `json:"namespace"`
	Version    int64  `json:"version"`
	ClientID   string `json:"clientId"`
	EntityType string `json:"entityType"`
	EntityID   int    `json:"entityId"`
	Op         string `json:"op"` // 'upsert' | 'delete'
	Data       any    `json:"data,omitempty"`
}

type RefreshToken struct {
	Token        string    `json:"token"`
	PlayerID     int       `json:"playerId"`
	TournamentID int       `json:"tournamentId"`
	ExpiresAt    time.Time `json:"expiresAt"`
	CreatedAt    time.Time `json:"createdAt"`
	Revoked      bool      `json:"revoked"`
}

// sync
type MutationOp struct {
	Op            string `json:"op"` // 'upsert' | 'delete'
	Type          string `json:"type"`
	ID            int    `json:"id"`
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
