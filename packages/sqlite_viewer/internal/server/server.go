package server

import (
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/patrick-salvatore/sqlite-viewer/internal/database"
)

type Server struct {
	db        *database.DB
	router    *chi.Mux
	StaticDir string
}

func New(db *database.DB, staticDir string) *Server {
	r := chi.NewRouter()

	// Middleware
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins: []string{"*"}, // For dev
		AllowedMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
	}))

	s := &Server{
		db:        db,
		router:    r,
		StaticDir: staticDir,
	}

	s.routes()
	return s
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	s.router.ServeHTTP(w, r)
}

func (s *Server) routes() {
	s.router.Get("/api/tables", s.handleGetTables)
	s.router.Get("/api/tables/{name}/schema", s.handleGetSchema)
	s.router.Get("/api/tables/{name}/data", s.handleGetData)
	s.router.Put("/api/tables/{name}/rows", s.handleUpdateRow)
	s.router.Post("/api/tables/{name}/rows", s.handleCreateRow)

	// Schema Editor Routes
	s.router.Post("/api/tables/{name}/columns", s.handleAddColumn)
	s.router.Put("/api/tables/{name}/columns/{colName}", s.handleRenameColumn)
	s.router.Delete("/api/tables/{name}/columns/{colName}", s.handleDropColumn)
	s.router.Get("/api/tables/{name}/indexes", s.handleGetIndexes)
	s.router.Post("/api/tables/{name}/indexes", s.handleCreateIndex)
	s.router.Delete("/api/indexes/{name}", s.handleDropIndex)

	s.router.Post("/api/tables", s.handleCreateTable)
	s.router.Delete("/api/tables/{name}", s.handleDropTable)

	if s.StaticDir != "" {

		fileServer := http.FileServer(http.Dir(s.StaticDir))
		s.router.Get("/*", func(w http.ResponseWriter, r *http.Request) {
			// Check if file exists
			path := filepath.Join(s.StaticDir, strings.TrimPrefix(r.URL.Path, "/"))

			// If asking for root, serve index.html (handled by FileServer usually, but being explicit is fine)
			if r.URL.Path == "/" {
				fileServer.ServeHTTP(w, r)
				return
			}

			// Check existence
			info, err := os.Stat(path)
			if os.IsNotExist(err) {
				// SPA Fallback: Serve index.html
				http.ServeFile(w, r, filepath.Join(s.StaticDir, "index.html"))
				return
			} else if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}

			// If directory, let FileServer handle (might show list or index.html)
			// If file, serve it
			if info.IsDir() {
				// If no index.html in subfolder, we might want fallback?
				// But for this app, we only have root index.html.
				// Let's rely on FileServer for existing paths.
			}

			fileServer.ServeHTTP(w, r)
		})
	}
}

func (s *Server) handleGetTables(w http.ResponseWriter, r *http.Request) {
	tables, err := s.db.GetTables()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(tables)
}

func (s *Server) handleGetSchema(w http.ResponseWriter, r *http.Request) {
	name := chi.URLParam(r, "name")
	schema, err := s.db.GetTableSchema(name)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(schema)
}

func (s *Server) handleGetData(w http.ResponseWriter, r *http.Request) {
	name := chi.URLParam(r, "name")

	limitStr := r.URL.Query().Get("limit")
	offsetStr := r.URL.Query().Get("offset")

	limit := 100
	offset := 0

	if limitStr != "" {
		if v, err := strconv.Atoi(limitStr); err == nil {
			limit = v
		}
	}
	if offsetStr != "" {
		if v, err := strconv.Atoi(offsetStr); err == nil {
			offset = v
		}
	}

	data, err := s.db.QueryTable(name, limit, offset)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(data)
}

func (s *Server) handleUpdateRow(w http.ResponseWriter, r *http.Request) {
	name := chi.URLParam(r, "name")

	var req database.UpdateRowRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if err := s.db.UpdateRow(name, req); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func (s *Server) handleCreateRow(w http.ResponseWriter, r *http.Request) {
	name := chi.URLParam(r, "name")

	var req database.CreateRowRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		// Allow empty body for default values
		if err.Error() != "EOF" {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
	}

	if err := s.db.CreateRow(name, req); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
}

func (s *Server) handleAddColumn(w http.ResponseWriter, r *http.Request) {
	name := chi.URLParam(r, "name")

	var req database.AddColumnRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if err := s.db.AddColumn(name, req); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
}

func (s *Server) handleRenameColumn(w http.ResponseWriter, r *http.Request) {
	name := chi.URLParam(r, "name")
	colName := chi.URLParam(r, "colName")

	var req database.RenameColumnRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if err := s.db.RenameColumn(name, colName, req); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
}

func (s *Server) handleDropColumn(w http.ResponseWriter, r *http.Request) {
	name := chi.URLParam(r, "name")
	colName := chi.URLParam(r, "colName")

	if err := s.db.DropColumn(name, colName); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
}

func (s *Server) handleGetIndexes(w http.ResponseWriter, r *http.Request) {
	name := chi.URLParam(r, "name")
	indexes, err := s.db.GetIndexes(name)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(indexes)
}

func (s *Server) handleCreateIndex(w http.ResponseWriter, r *http.Request) {
	name := chi.URLParam(r, "name")

	var req database.CreateIndexRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if err := s.db.CreateIndex(name, req); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusCreated)
}

func (s *Server) handleDropIndex(w http.ResponseWriter, r *http.Request) {
	name := chi.URLParam(r, "name")

	if err := s.db.DropIndex(name); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
}

func (s *Server) handleCreateTable(w http.ResponseWriter, r *http.Request) {
	var req database.CreateTableRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if err := s.db.CreateTable(req); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusCreated)
}

func (s *Server) handleDropTable(w http.ResponseWriter, r *http.Request) {
	name := chi.URLParam(r, "name")

	if err := s.db.DropTable(name); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
}
