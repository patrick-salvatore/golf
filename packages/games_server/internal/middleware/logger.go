package middleware

import (
	"log"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5/middleware"
)

// MetricsLogger logs detailed metrics for each request
func MetricsLogger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		// Wrap the response writer to capture the status code
		ww := middleware.NewWrapResponseWriter(w, r.ProtoMajor)

		next.ServeHTTP(ww, r)

		duration := time.Since(start)

		log.Printf("[METRICS] Time: %s | Method: %s | Path: %s | Status: %d | Duration: %v",
			start.Format(time.RFC3339),
			r.Method,
			r.URL.Path,
			ww.Status(),
			duration,
		)
	})
}
