package main

import (
	"log"
	"net/http"
	"os"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/joho/godotenv"
	"github.com/patrick-salvatore/games-server/internal/handlers"
	"github.com/patrick-salvatore/games-server/internal/infra"
	internalMiddleware "github.com/patrick-salvatore/games-server/internal/middleware"
	"github.com/patrick-salvatore/games-server/internal/store"
)

func main() {
	if err := godotenv.Load(); err != nil {
		panic(err)
	}

	// Database Setup
	dbPath := os.Getenv("DB_PATH")
	if dbPath == "" {
		dbPath = "golf.db"
	}

	sqlDB, err := store.New(dbPath)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer sqlDB.Close()

	if err := store.InitSchema(sqlDB); err != nil {
		log.Fatalf("Failed to initialize database schema: %v", err)
	}

	db := store.NewStore(sqlDB)

	// Cache Setup
	cacheManager, err := infra.NewCacheManager()
	if err != nil {
		log.Fatalf("Failed to initialize cache: %v", err)
	}

	// Router Setup
	r := chi.NewRouter()

	// Middleware
	// r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"}, // Allow all for local dev
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token", "X-Invite-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Routes
	r.Get("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("OK"))
	})

	// Public: Invites are public entry points
	r.Get("/v1/invites/{token}", handlers.GetInvite(db))

	// Public: Session Management (Player Selection)
	r.Get("/v1/tournament/players/available", handlers.GetAvailablePlayers(db))
	r.Post("/v1/tournament/players/select", handlers.SelectPlayer(db))

	r.Group(func(api chi.Router) {
		r.With(internalMiddleware.RefreshTokenAuthMiddleware(db)).Post("/v1/session/refresh", handlers.HandleRefresh)
	})

	// Admin Only Routes
	r.Group(func(r chi.Router) {
		r.Use(internalMiddleware.AuthMiddleware)

		r.With(internalMiddleware.RequireAdmin).Get("/v1/tournament_formats", handlers.GetAllFormats(db))
		r.With(internalMiddleware.RequireAdmin).Post("/v1/tournaments", handlers.CreateTournament(db))
		r.With(internalMiddleware.RequireAdmin).Post("/v1/tournament/{id}/rounds", handlers.CreateTournamentRound(db))
		r.With(internalMiddleware.RequireTournamentOrAdmin).Post("/v1/players", handlers.CreatePlayer(db))
		r.With(internalMiddleware.RequireTournamentOrAdmin).Post("/v1/invites", handlers.CreateInvite(db))
	})

	// Protected Routes (General Auth)
	r.Group(func(r chi.Router) {
		r.Use(internalMiddleware.AuthMiddleware)

		// Players
		r.Get("/v1/players", handlers.GetPlayers(db))

		// Tournaments
		r.Get("/v1/tournaments", handlers.GetTournaments(db))
		r.Get("/v1/tournament/{id}", handlers.GetTournament(db))
		r.Get("/v1/tournaments/{id}/teams", handlers.GetTeamsByTournament(db))

		// Tournament Rounds
		r.Get("/v1/tournament/{id}/rounds", handlers.GetTournamentRounds(db))
		r.Get("/v1/round/{roundId}", handlers.GetTournamentRound(db))
		r.Get("/v1/round/{roundId}/course", handlers.GetCourseByTournamentRoundID(db))

		// Teams
		r.Get("/v1/teams/{id}", handlers.GetTeam(db))
		r.Get("/v1/teams/{id}/players", handlers.GetTeamPlayers(db))

		// Courses
		r.Get("/v1/courses", handlers.GetCourses(db))

		// Session
		r.Get("/v1/session", handlers.GetSession)
		r.Post("/v1/session/leave", handlers.LeaveSession(db))
		r.Post("/v1/session/round", handlers.SwitchRound(db))

		// Scores
		r.Get("/v1/scores", handlers.GetTournamentScores(db)) // filtered by queryParam
		r.Post("/v1/scores", handlers.SubmitScore(db, cacheManager))
		r.Post("/v1/scores/team", handlers.SubmitTeamScore(db, cacheManager))

		// Round Scores
		r.Get("/v1/round/{roundId}/scores", handlers.GetRoundScores(db))
		r.Post("/v1/round/{roundId}/scores", handlers.SubmitRoundScore(db, cacheManager))

		// Leaderboard
		r.Get("/v1/tournament/{id}/leaderboard", handlers.GetLeaderboard(db, cacheManager))
		r.Get("/v1/tournament/{id}/round/{roundId}/leaderboard", handlers.GetRoundLeaderboard(db, cacheManager))

		// Sync Engine
		r.Get("/v1/sync", handlers.Sync(db))
		r.Get("/v1/events", handlers.Events(db))
		r.Post("/v1/mutate", handlers.Mutate(db))
	})

	log.Println("Server starting on :8080")
	if err := http.ListenAndServe(":8080", r); err != nil {
		log.Fatal(err)
	}
}
