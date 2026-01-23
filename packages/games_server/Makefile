.PHONY: all build run seed deps clean

# Default target
all: build

# Build the server binary
build:
	go build -o bin/server ./main.go

# Run the server (development)
run:
	go run ./main.go

# Run the database seeder
seed:
	go run ./cmd/seed/main.go

# Install dependencies
deps:
	go get modernc.org/sqlite
	go get github.com/go-chi/chi/v5
	go get github.com/go-chi/cors
	go mod tidy

# Clean build artifacts
clean:
	rm -rf bin/
	rm -f golf.db

# -- SQLC & Migrations --

# Generate Go code from SQL
sqlc-generate:
	go run github.com/sqlc-dev/sqlc/cmd/sqlc@latest generate

# Check SQL syntax and type errors
sqlc-compile:
	go run github.com/sqlc-dev/sqlc/cmd/sqlc@latest compile

# Create a new migration file
# Usage: make migrate-create NAME=add_users
migrate-create:
	@if [ -z "$(NAME)" ]; then echo "Error: NAME is required. Usage: make migrate-create NAME=description"; exit 1; fi
	@NEXT_VER=$$(ls db/migrations | sort | tail -n 1 | awk -F'_' '{printf "%03d", $$1+1}'); \
	if [ -z "$$NEXT_VER" ]; then NEXT_VER="001"; fi; \
	FILENAME="db/migrations/$${NEXT_VER}_$(NAME).sql"; \
	touch $$FILENAME; \
	echo "Created migration: $$FILENAME"
