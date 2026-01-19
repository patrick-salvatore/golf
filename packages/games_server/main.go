package main

import (
	"log"
	"net/http"
	"os"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/patrick-salvatore/games-server/internal/handlers"
	internalMiddleware "github.com/patrick-salvatore/games-server/internal/middleware"
	"github.com/patrick-salvatore/games-server/internal/store"
)

func main() {
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

	// Router Setup
	r := chi.NewRouter()

	// Middleware
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"}, // Allow all for local dev
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Routes
	r.Get("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("OK"))
	})

	// Public: Formats are public info
	r.Get("/v1/tournament_formats", handlers.GetAllFormats(db))

	// Public: Invites are public entry points
	r.Get("/v1/invites/{token}", handlers.GetInvite(db))
	r.Post("/v1/invites/{token}/accept", handlers.AcceptInvite(db))

	// Session Management (Player Selection) - Public
	r.Get("/v1/tournament/players/available", handlers.GetAvailablePlayers(db))
	r.Post("/v1/tournament/players/select", handlers.SelectPlayer(db))

	// Unauthed Identity Check
	r.Get("/v1/identity", handlers.GetIdentity)

	r.Group(func(r chi.Router) {
		r.Use(internalMiddleware.AuthMiddleware) // Must run first to populate context
		// Guarded Player Creation: Requires Invite (TournamentID) OR Admin
		r.With(internalMiddleware.RequireTournamentOrAdmin).Post("/v1/players", handlers.CreatePlayer(db))
		r.With(internalMiddleware.RequireTournamentOrAdmin).Post("/v1/invites", handlers.CreateInvite(db))
	})

	// Protected Routes (General Auth)
	r.Group(func(r chi.Router) {
		r.Use(internalMiddleware.AuthMiddleware)

		r.Get("/v1/players", handlers.GetPlayers(db))
		r.Get("/v1/tournaments", handlers.GetTournaments(db))
		r.Get("/v1/tournament/{id}", handlers.GetTournament(db))
		r.Get("/v1/tournaments/{id}/teams", handlers.GetTeamsByTournament(db))
		r.Get("/v1/courses", handlers.GetCourses(db))

		// Sync Engine
		r.Get("/api/sync", handlers.Sync(db))
		r.Get("/api/events", handlers.Events(db))
		r.Post("/api/mutate", handlers.Mutate(db))

		// Session Management
		r.Post("/v1/session/leave", handlers.LeaveSession(db))

		// Scores
		r.Post("/v1/scores", handlers.SubmitScore(db))
	})

	// Admin Only Routes
	r.Group(func(r chi.Router) {
		r.Use(internalMiddleware.AuthMiddleware)
		r.Use(internalMiddleware.RequireAdmin)

		r.Post("/v1/tournaments", handlers.CreateTournament(db))
		// r.Post("/v1/courses", handlers.CreateCourse(db)) // If we had this
	})

	log.Println("Server starting on :8080")
	if err := http.ListenAndServe(":8080", r); err != nil {
		log.Fatal(err)
	}
}
