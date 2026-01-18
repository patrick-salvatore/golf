package controllers

import (
	"net/http"
	"time"

	"github.com/pocketbase/pocketbase/core"
)

func HandleHealthzRequest(e *core.RequestEvent) error {
	now := time.Now().Format("2006-01-02T15:04:05.000Z")
	data := map[string]interface{}{"now": now}

	return e.JSON(http.StatusOK, data)
}
