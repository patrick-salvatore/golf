package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/patrick-salvatore/games-server/internal/store"
)

func GetAllFormats(db *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		formats, err := db.GetAllFormats()
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		json.NewEncoder(w).Encode(formats)
	}
}
