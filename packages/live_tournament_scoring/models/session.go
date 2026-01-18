package models

import (
	"log/slog"
	"time"

	"github.com/patrick-salvatore/tournament-live-scoring/internal/security"
	"github.com/patrick-salvatore/tournament-live-scoring/internal/utils"
	"github.com/pocketbase/dbx"
)

const SESSION_ID_LEN = 15

type Session struct {
	secretHash string

	Id             string    `db:"id" json:"id"`
	TeamId         string    `db:"team_id" json:"teamId"`
	LastVerifiedAt time.Time `db:"last_verified_at" json:"lastVerifiedAt"`
	CreatedAt      time.Time `db:"create_at" json:"createAt"`
	ExpiresAt      time.Time `db:"expires_at" json:"expiresAt"`
}

type ValidatedSession struct {
	Id        string
	CreatedAt time.Time
}

const (
	sessionExpiresInTime         = 2 * 24 * time.Hour // 2 day
	activityCheckIntervalSeconds = 60 * 60            // 1 hour
)

func CreateSession(db dbx.Builder, teamId string) (*Session, error) {
	id := security.RandomString(SESSION_ID_LEN)
	now := time.Now()
	secretHash := utils.GetEnvVarOrPanic("ACCESS_TOKEN_SECRET")

	var session Session

	err := db.Insert("sessions", dbx.Params{
		"id":               id,
		"team_id":          teamId,
		"secret_hash":      secretHash,
		"expires_at":       time.Now().Add(sessionExpiresInTime),
		"last_verified_at": now,
	}).One(&session)

	if err != nil {
		return nil, err
	}

	return &session, nil
}

func ValidateSessionToken(db dbx.Builder, sessionId string) (*Session, error) {
	var session Session

	err := db.
		NewQuery("SELECT * FROM session WHERE id = {:id}").
		Bind(dbx.Params{
			"id": sessionId,
		}).
		One(&session)
	if err != nil {
		return nil, err
	}

	if !isWithinExpirationDate(session.ExpiresAt) {
		_, err := db.NewQuery("DELETE FROM session WHERE id = {:id}").
			Bind(dbx.Params{
				"id": session.Id,
			}).
			Execute()
		if err != nil {
			slog.Error(err.Error())
		}
		return nil, nil
	}

	now := time.Now()
	if now.Sub(session.LastVerifiedAt) >= activityCheckIntervalSeconds*time.Second {
		session.LastVerifiedAt = now

		_, err := db.NewQuery(`
			UPDATE session
			SET
				last_verified_at = {:lastVerifiedAt}
			WHERE id = {:id}`).
			Bind(dbx.Params{
				"lastVerifiedAt": now,
			}).
			Execute()
		if err != nil {
			slog.Error(err.Error())
		}
	}

	return &session, nil

}

// Helper to check if a given date is still valid
func isWithinExpirationDate(date time.Time) bool {
	return time.Now().Before(date)
}
