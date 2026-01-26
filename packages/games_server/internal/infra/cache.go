package infra

import (
	"fmt"
	"net/http"
	"time"

	"github.com/dgryski/go-farm"
	"github.com/victorspringer/http-cache"
	"github.com/victorspringer/http-cache/adapter/memory"
)

type CacheManager struct {
	Client  *cache.Client
	Adapter cache.Adapter
}

func NewCacheManager() (*CacheManager, error) {
	memAdapter, err := memory.NewAdapter(
		memory.AdapterWithAlgorithm(memory.LRU),
		memory.AdapterWithCapacity(10000),
	)
	if err != nil {
		return nil, err
	}

	client, err := cache.NewClient(
		cache.ClientWithAdapter(memAdapter),
		cache.ClientWithTTL(60*time.Second),
	)
	if err != nil {
		return nil, err
	}

	return &CacheManager{
		Client:  client,
		Adapter: memAdapter,
	}, nil
}

// Middleware returns the cache middleware handler
func (cm *CacheManager) Middleware() func(http.Handler) http.Handler {
	return cm.Client.Middleware
}

// InvalidateLeaderboard evicts the leaderboard cache for a given tournament
func (cm *CacheManager) InvalidateLeaderboard(tournamentID int) {
	// The key defaults to the request URL path (and query).
	// We assume standard request /v1/tournament/{id}/leaderboard
	keyStr := fmt.Sprintf("/v1/tournament/%d/leaderboard", tournamentID)

	// http-cache uses farm.Hash64 for the default key generation
	key := farm.Hash64([]byte(keyStr))

	cm.Adapter.Release(key)
}
