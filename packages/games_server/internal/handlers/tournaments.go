package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sort"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/patrick-salvatore/games-server/internal/models"
	"github.com/patrick-salvatore/games-server/internal/store"
)

// -- Tournaments --

func GetTournaments(db *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tournaments, err := db.GetAllTournaments()
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		json.NewEncoder(w).Encode(tournaments)
	}
}

func GetTournament(db *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		idParam := chi.URLParam(r, "id")

		id, err := strconv.Atoi(idParam)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		t, err := db.GetTournament(id)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		if t == nil {
			http.Error(w, "Tournament not found", http.StatusNotFound)
			return
		}
		json.NewEncoder(w).Encode(t)
	}
}

func CreateTournament(db *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req models.CreateTournamentRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		// 1. Create Tournament Record
		t, err := db.CreateTournament(req)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		// 2. Generate Teams Logic (Ported from old controller)
		if len(req.Players) > 0 {
			teams, err := generateTeams(t.ID, req.Players, req.TeamCount)
			if err != nil {
				// In a real app we might rollback here, keeping it simple for now
				http.Error(w, err.Error(), http.StatusBadRequest)
				return
			}

			// 3. Save Teams and Player Assignments
			for _, teamData := range teams {
				teamID, err := db.CreateTeam(t.ID, teamData.Name)
				if err != nil {
					http.Error(w, err.Error(), http.StatusInternalServerError)
					return
				}

				for _, p := range teamData.Players {
					if err := db.AddPlayerToTeam(teamID, p.ID, t.ID); err != nil {
						http.Error(w, err.Error(), http.StatusInternalServerError)
						return
					}
				}
			}
		}

		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(t)
	}
}

type teamWithPlayers struct {
	Name    string
	Players []models.Player
}

func generateTeams(tournamentId int, players []models.Player, teamCount int) ([]teamWithPlayers, error) {
	if teamCount <= 0 {
		return nil, fmt.Errorf("invalid TeamCount, must be at least 1")
	}
	if len(players)%teamCount != 0 {
		return nil, fmt.Errorf("player count (%d) must be divisible by team size (%d)", len(players), teamCount)
	}

	// Sort by handicap for snake draft balancing
	sort.Slice(players, func(i, j int) bool {
		return players[i].Handicap < players[j].Handicap
	})

	numTeams := len(players) / teamCount
	teams := make([]teamWithPlayers, numTeams)

	// "Snake" distribution logic
	// e.g. 1 2 3 4 ... 4 3 2 1
	for i := 0; i < teamCount; i++ {
		for j := 0; j < numTeams; j++ {
			playerIdx := 0
			if i%2 == 0 {
				// Forward pass
				playerIdx = (i * numTeams) + j
			} else {
				// Backward pass
				playerIdx = (i * numTeams) + (numTeams - 1 - j)
			}
			teams[j].Players = append(teams[j].Players, players[playerIdx])
		}
	}

	// Generate Names
	for i := range teams {
		names := []string{}
		for _, p := range teams[i].Players {
			names = append(names, fmt.Sprintf("%s (%.1f)", p.Name, p.Handicap))
		}
		teams[i].Name = strings.Join(names, " + ")
	}

	return teams, nil
}

func SetupTournament(db *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req models.SetupTournamentRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		if len(req.Rounds) == 0 {
			http.Error(w, "At least one round is required", http.StatusBadRequest)
			return
		}
		if req.TeamCount <= 0 {
			http.Error(w, "TeamCount must be greater than 0", http.StatusBadRequest)
			return
		}

		t, err := db.SetupTournamentTx(req)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(t)
	}
}
