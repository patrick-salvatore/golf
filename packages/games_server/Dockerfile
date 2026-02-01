# --- Stage 1: Build ---
FROM golang:1.23-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache git build-base

# Cache dependencies
COPY go.mod go.sum ./
RUN go mod download

# Build
COPY . .
RUN go build -o main .

# --- Stage 2: Run ---
FROM alpine:latest

WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache ca-certificates

# Copy binary
COPY --from=builder /app/main .
# Copy migrations if they aren't embedded (assuming they are embedded based on code, but checking file structure suggests 'db/migrations' exists. If code uses embed, we don't need to copy. Code in 'internal/store/db.go' uses 'migrations.FS', which implies embed. So no copy needed.)

# Create directory for sqlite volume
RUN mkdir -p /data

# Set Env to use the volume
ENV DB_PATH=/data/golf.db

EXPOSE 8080

CMD ["./main"]
