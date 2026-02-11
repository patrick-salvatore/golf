package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/patrick-salvatore/games-server/internal/middleware"
	"github.com/patrick-salvatore/games-server/internal/models"
	"github.com/patrick-salvatore/games-server/internal/store"
)

// -- Broadcaster System --

const (
	// ClientLifespan defines how long a client connection can live before forced reconnection
	ClientLifespan = 60 * time.Minute
)

type clientInfo struct {
	ch      chan int64
	expires time.Time
}

type Broadcaster struct {
	mu      sync.Mutex
	clients map[int]map[*clientInfo]bool // namespace -> set of client info
}

var broadcaster = &Broadcaster{
	clients: make(map[int]map[*clientInfo]bool),
}

func init() {
	// Start periodic cleanup of expired clients
	go func() {
		ticker := time.NewTicker(1 * time.Minute)
		defer ticker.Stop()
		for range ticker.C {
			broadcaster.CleanupExpiredClients()
		}
	}()
}

func (b *Broadcaster) Subscribe(namespace int) (chan int64, time.Time) {
	b.mu.Lock()
	defer b.mu.Unlock()

	ch := make(chan int64, 10) // buffer to hold a few updates
	expires := time.Now().Add(ClientLifespan)

	info := &clientInfo{
		ch:      ch,
		expires: expires,
	}

	if _, ok := b.clients[namespace]; !ok {
		b.clients[namespace] = make(map[*clientInfo]bool)
	}
	b.clients[namespace][info] = true

	return ch, expires
}

func (b *Broadcaster) Unsubscribe(namespace int, ch chan int64) {
	b.mu.Lock()
	defer b.mu.Unlock()
	if clients, ok := b.clients[namespace]; ok {
		for info := range clients {
			if info.ch == ch {
				delete(clients, info)
				close(ch)
				break
			}
		}
		if len(clients) == 0 {
			delete(b.clients, namespace)
		}
	}
}

func (b *Broadcaster) Broadcast(namespace int, version int64) {
	b.mu.Lock()
	defer b.mu.Unlock()
	if clients, ok := b.clients[namespace]; ok {
		now := time.Now()
		for info := range clients {
			// Skip expired clients (they will be cleaned up when they disconnect)
			if now.After(info.expires) {
				continue
			}
			select {
			case info.ch <- version:
			default:
				// Client too slow, drop message (SSE/Long-poll will catch up)
			}
		}
	}
}

// CleanupExpiredClients removes clients that have exceeded their lifespan
func (b *Broadcaster) CleanupExpiredClients() {
	b.mu.Lock()
	defer b.mu.Unlock()
	now := time.Now()
	for namespace, clients := range b.clients {
		for info := range clients {
			if now.After(info.expires) {
				delete(clients, info)
				close(info.ch)
			}
		}
		if len(clients) == 0 {
			delete(b.clients, namespace)
		}
	}
}

// -- Helpers --

func getNamespace(r *http.Request) (int, error) {
	tournamentID, ok := r.Context().Value(middleware.TournamentIDKey).(int)
	if ok && tournamentID != 0 {
		return tournamentID, nil
	}

	playerID, ok := r.Context().Value(middleware.PlayerIDKey).(int)
	if !ok || playerID == 0 {
		return 0, fmt.Errorf("namespace (playerId or tournamentId) not found in context")
	}

	return playerID, nil
}

// -- Handlers --

func Mutate(db *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		namespace, err := getNamespace(r)
		if err != nil {
			http.Error(w, err.Error(), http.StatusUnauthorized)
			return
		}

		var req models.MutateRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		tx, err := db.DB.Begin()
		if err != nil {
			http.Error(w, "Failed to start transaction", http.StatusInternalServerError)
			return
		}
		defer tx.Rollback()

		// Clear previous context just in case (though should be empty)
		_, _ = tx.Exec("DELETE FROM _tx_context")
		_, err = tx.Exec("INSERT INTO _tx_context (client_id) VALUES (?)", req.ClientID)
		if err != nil {
			http.Error(w, "Failed to set tx context", http.StatusInternalServerError)
			return
		}

		for _, mut := range req.Mutations {
			// Validate Entity Type (Registry check could go here)

			dataBytes, _ := json.Marshal(mut.Data)
			dataStr := string(dataBytes)
			now := time.Now().UnixMilli()

			if mut.Op == "upsert" {
				// Conflict Detection
				if mut.BaseUpdatedAt > 0 {
					var currentUpdatedAt int64
					err := tx.QueryRow("SELECT updated_at FROM entities WHERE namespace=? AND type=? AND entity_id=?", namespace, mut.Type, mut.ID).Scan(&currentUpdatedAt)
					if err == nil && currentUpdatedAt > mut.BaseUpdatedAt {
						// Conflict!
						// For now, we just skip or error?
						// Plan says "If affected rows = 0 -> return conflict = true"
						// We can implement that logic.
						// Let's use the UPDATE ... WHERE logic from plan.
					}
				}

				// UPSERT using standard SQLite ON CONFLICT
				// But we need to check BaseUpdatedAt.
				// The plan says: UPDATE ... WHERE updated_at <= ?

				// Attempt Update first
				res, err := tx.Exec(`
					UPDATE entities 
					SET data=?, updated_at=?, updated_by=? 
					WHERE namespace=? AND type=? AND entity_id=? AND updated_at <= ?`,
					dataStr, now, req.ClientID, namespace, mut.Type, mut.ID, mut.BaseUpdatedAt)

				if err != nil {
					http.Error(w, err.Error(), http.StatusInternalServerError)
					return
				}

				rowsAffected, _ := res.RowsAffected()
				if rowsAffected == 0 {
					// Check if it exists
					var exists int
					err := tx.QueryRow("SELECT 1 FROM entities WHERE namespace=? AND type=? AND entity_id=?", namespace, mut.Type, mut.ID).Scan(&exists)
					if err == sql.ErrNoRows {
						// Insert
						_, err = tx.Exec(`
							INSERT INTO entities (namespace, type, entity_id, data, updated_at, updated_by)
							VALUES (?, ?, ?, ?, ?, ?)`,
							namespace, mut.Type, mut.ID, dataStr, now, req.ClientID)
						if err != nil {
							http.Error(w, err.Error(), http.StatusInternalServerError)
							return
						}
					} else {
						// Exists but update failed -> CONFLICT
						// We can treat this as a failure or just ignore (last write wins is not applied here, server wins)
						// The client will get the server state on next sync.
						fmt.Println("Conflict detected for", mut.Type, mut.ID)
					}
				}

			} else if mut.Op == "delete" {
				_, err := tx.Exec("DELETE FROM entities WHERE namespace=? AND type=? AND entity_id=?", namespace, mut.Type, mut.ID)
				if err != nil {
					http.Error(w, err.Error(), http.StatusInternalServerError)
					return
				}
			}
		}

		// Clean up context (optional, but good practice inside tx)
		_, _ = tx.Exec("DELETE FROM _tx_context")

		if err := tx.Commit(); err != nil {
			http.Error(w, "Commit failed", http.StatusInternalServerError)
			return
		}

		// Broadcast new version
		var version int64
		_ = db.DB.QueryRow("SELECT value FROM meta WHERE key='version'").Scan(&version)
		broadcaster.Broadcast(namespace, version)

		w.WriteHeader(http.StatusOK)
	}
}

func Sync(db *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		namespace, err := getNamespace(r)
		if err != nil {
			http.Error(w, err.Error(), http.StatusUnauthorized)
			return
		}

		sinceStr := r.URL.Query().Get("since")
		waitStr := r.URL.Query().Get("wait")
		since, _ := strconv.ParseInt(sinceStr, 10, 64)
		wait, _ := strconv.ParseInt(waitStr, 10, 64)
		if wait > 30 {
			wait = 30
		}

		// Check for immediate updates
		changes, currentVersion, err := getChanges(db, namespace, since)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		// If no changes and wait requested
		if len(changes) == 0 && wait > 0 {
			ch, expires := broadcaster.Subscribe(namespace)
			defer broadcaster.Unsubscribe(namespace, ch)

			// Check if connection should be forced to close
			timeout := time.Until(expires)
			if timeout > time.Duration(wait)*time.Second {
				timeout = time.Duration(wait) * time.Second
			}

			select {
			case <-ch:
				// New version available, fetch changes
				changes, currentVersion, err = getChanges(db, namespace, since)
				if err != nil {
					http.Error(w, err.Error(), http.StatusInternalServerError)
					return
				}
			case <-time.After(timeout):
				// Timeout or lifespan expired, return empty
			case <-r.Context().Done():
				// Client disconnected
				return
			}
		}

		resp := models.SyncResponse{
			Version: currentVersion,
			Changes: changes,
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(resp)
	}
}

func Events(db *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		namespace, err := getNamespace(r)
		if err != nil {
			http.Error(w, err.Error(), http.StatusUnauthorized)
			return
		}

		w.Header().Set("Content-Type", "text/event-stream")
		w.Header().Set("Cache-Control", "no-cache")
		w.Header().Set("Connection", "keep-alive")
		w.Header().Set("Access-Control-Allow-Origin", "*")

		flusher, ok := w.(http.Flusher)
		if !ok {
			http.Error(w, "Streaming unsupported", http.StatusInternalServerError)
			return
		}

		ch, expires := broadcaster.Subscribe(namespace)
		defer broadcaster.Unsubscribe(namespace, ch)

		// Send initial ping with expiry time (in seconds from now)
		expiresIn := int(time.Until(expires).Seconds())
		fmt.Fprintf(w, ": connected\n")
		fmt.Fprintf(w, "event: connected\n")
		fmt.Fprintf(w, "data: {\"expiresIn\": %d}\n\n", expiresIn)
		flusher.Flush()

		// Create a timer for forced disconnect at lifespan expiry
		lifespanTimer := time.NewTimer(time.Until(expires))
		defer lifespanTimer.Stop()

		for {
			select {
			case v := <-ch:
				fmt.Fprintf(w, "data: %d\n\n", v)
				flusher.Flush()
			case <-lifespanTimer.C:
				// Lifespan expired, close connection to force client reconnection
				fmt.Fprintf(w, "event: expired\n")
				fmt.Fprintf(w, "data: connection lifespan expired\n\n")
				flusher.Flush()
				return
			case <-r.Context().Done():
				return
			}
		}
	}
}

func getChanges(db *store.Store, namespace int, since int64) ([]models.ChangelogEntry, int64, error) {
	rows, err := db.DB.Query(`
		SELECT namespace, version, client_id, entity_type, entity_id, op, data 
		FROM changelog 
		WHERE namespace = ? AND version > ? 
		ORDER BY version ASC`, namespace, since)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var changes []models.ChangelogEntry
	var maxVersion int64 = since

	for rows.Next() {
		var c models.ChangelogEntry
		var dataStr sql.NullString
		if err := rows.Scan(&c.Namespace, &c.Version, &c.ClientID, &c.EntityType, &c.EntityID, &c.Op, &dataStr); err != nil {
			return nil, 0, err
		}
		if dataStr.Valid {
			_ = json.Unmarshal([]byte(dataStr.String), &c.Data)
		}
		changes = append(changes, c)
		if c.Version > maxVersion {
			maxVersion = c.Version
		}
	}

	// If no changes, get current version from meta
	if len(changes) == 0 {
		_ = db.DB.QueryRow("SELECT value FROM meta WHERE key='version'").Scan(&maxVersion)
	}

	return changes, maxVersion, nil
}
