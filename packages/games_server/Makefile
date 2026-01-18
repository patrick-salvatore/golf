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
