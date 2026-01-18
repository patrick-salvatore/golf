package logger

import (
	"log/slog"
	"os"
)

// Logger is our custom logger type
type Logger struct {
	*slog.Logger
}

// LogLevel represents the logging level
type LogLevel int

const (
	DEBUG LogLevel = iota
	INFO
	WARN
	ERROR
)

// NewLogger creates and returns a new Logger instance
func NewLogger(level LogLevel) *Logger {
	var logLevel slog.Level

	switch level {
	case DEBUG:
		logLevel = slog.LevelDebug
	case INFO:
		logLevel = slog.LevelInfo
	case WARN:
		logLevel = slog.LevelWarn
	case ERROR:
		logLevel = slog.LevelError
	default:
		logLevel = slog.LevelInfo
	}

	opts := &slog.HandlerOptions{
		Level: logLevel,
	}

	handler := slog.NewJSONHandler(os.Stdout, opts)
	logger := slog.New(handler)

	return &Logger{logger}
}

// Debug logs a debug message
func (l *Logger) Debug(msg string, args ...any) {
	l.Logger.Debug(msg, args...)
}

// Info logs an info message
func (l *Logger) Info(msg string, args ...any) {
	l.Logger.Info(msg, args...)
}

// Warn logs a warning message
func (l *Logger) Warn(msg string, args ...any) {
	l.Logger.Warn(msg, args...)
}

// Error logs an error message
func (l *Logger) Error(msg string, args ...any) {
	l.Logger.Error(msg, args...)
}
