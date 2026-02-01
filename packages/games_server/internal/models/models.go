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
	ID              int     `json:"id"`
	Number          int     `json:"number"`
	Par             int     `json:"par"`
	Handicap        int     `json:"handicap"`
	RawHandicap     int     `json:"rawHandicap"`
	AllowedHandicap float64 `json:"allowedHandicap"`
	Yardage         int     `json:"yardage"`
}

type AvailablePlayer struct {
	PlayerID     int     `json:"playerId"`
	Name         string  `json:"name"`
	Handicap     float32 `json:"handicap"`
	TeamID       int     `json:"teamId"`
	TournamentID int     `json:"tournamentId"`
}

type TournamentRound struct {
	ID              int    `json:"id"`
	TournamentID    int    `json:"tournamentId"`
	FormatID        int    `json:"formatId"`
	CourseID        int    `json:"courseId"`
	RoundNumber     int    `json:"roundNumber"`
	AwardedHandicap int    `json:"awardedHandicap"`
	IsMatchPlay     bool   `json:"isMatchPlay"`
	Date            string `json:"date"`
	Name            string `json:"name"`
	Status          string `json:"status"`
	CourseName      string `json:"courseName,omitempty"`
	CreatedAt       string `json:"createdAt"`
}

type Tournament struct {
	ID        int               `json:"id"`
	Name      string            `json:"name"`
	TeamCount int               `json:"teamCount"`
	Complete  bool              `json:"complete"`
	StartDate string            `json:"startDate"`
	EndDate   string            `json:"endDate"`
	CreatedAt string            `json:"created"`
	Rounds    []TournamentRound `json:"rounds,omitempty"`
}

type CreateRoundRequest struct {
	RoundNumber int    `json:"roundNumber"`
	RoundDate   string `json:"roundDate"`
	CourseID    int    `json:"courseId"`
	TeeSet      string `json:"teeSet"`
	Name        string `json:"name"`
}

type CreateTournamentRequest struct {
	Name            string               `json:"name"`
	FormatID        int                  `json:"formatId"`
	TeamCount       int                  `json:"teamCount"`
	AwardedHandicap float64              `json:"awardedHandicap"`
	IsMatchPlay     bool                 `json:"isMatchPlay"`
	StartDate       string               `json:"startDate"`
	EndDate         string               `json:"endDate"`
	StartTime       string               `json:"startTime,omitempty"` // Legacy field
	Players         []Player             `json:"players"`
	Rounds          []CreateRoundRequest `json:"rounds"`
}

type SetupTournamentRequest struct {
	Name            string       `json:"name"`
	TeamCount       int          `json:"teamCount"`
	AwardedHandicap float64      `json:"awardedHandicap"`
	Rounds          []RoundSetup `json:"rounds"`
	Groups          []string     `json:"groups"` // List of group names
	Teams           []TeamSetup  `json:"teams"`
}

type RoundSetup struct {
	RoundNumber int    `json:"roundNumber"`
	Name        string `json:"name"`
	Date        string `json:"date"` // YYYY-MM-DD
	FormatID    int    `json:"formatId"`
	CourseID    int    `json:"courseId"`
	Status      string `json:"status"` // "pending", "active", "completed"
}

type TeamSetup struct {
	Name      string `json:"name"`
	GroupName string `json:"groupName,omitempty"` // Must match one of the names in Groups
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
	ID                int    `json:"id"`
	TournamentID      *int   `json:"tournamentId,omitempty"`      // Keep for backwards compatibility
	TournamentRoundID *int   `json:"tournamentRoundId,omitempty"` // New field
	PlayerID          *int   `json:"playerId,omitempty"`          // Pointer to allow null
	TeamID            *int   `json:"teamId,omitempty"`            // Pointer to allow null
	CourseHoleID      int    `json:"courseHoleId"`
	HoleNumber        int    `json:"holeNumber,omitempty"` // Enriched field
	Strokes           int    `json:"strokes"`
	CreatedAt         string `json:"createdAt"`
}

type SubmitScoreRequest struct {
	TournamentID int  `json:"tournamentId,omitempty"` // Legacy support
	RoundID      *int `json:"roundId,omitempty"`      // New field
	PlayerID     *int `json:"playerId,omitempty"`
	TeamID       *int `json:"teamId,omitempty"`
	CourseHoleID int  `json:"courseHoleId"`
	Strokes      int  `json:"strokes"`
}

type SubmitRoundScoreRequest struct {
	PlayerID     *int `json:"playerId,omitempty"`
	TeamID       *int `json:"teamId,omitempty"`
	CourseHoleID int  `json:"courseHoleId"`
	Strokes      int  `json:"strokes"`
}

type TeamGroup struct {
	ID           int       `json:"id"`
	Name         string    `json:"name"`
	TournamentID int       `json:"tournamentId"`
	CreatedAt    time.Time `json:"createdAt"`
}

type TeamGroupMember struct {
	TeamID  int64 `json:"teamId"`
	GroupID int64 `json:"groupId"`
}

type TournamentReward struct {
	ID           int64     `json:"id"`
	TournamentID int64     `json:"tournamentId"`
	Scope        string    `json:"scope"`
	Metric       string    `json:"metric"`
	Description  string    `json:"description,omitempty"`
	CreatedAt    time.Time `json:"createdAt"`
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
