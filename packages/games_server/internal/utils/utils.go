package utils

import "os"

func DerefString(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

func GetEnvVarOrPanic(key string) string {
	value := os.Getenv(key)
	if value == "" {
		panic(key + " is not set")
	}

	return value
}
