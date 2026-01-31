package infra

import (
	"encoding/json"
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

// InvalidateRoundStats evicts the round stats cache for a given round
func (cm *CacheManager) InvalidateRoundStats(roundID int) {
	keyStr := fmt.Sprintf("round_stats:%d", roundID)
	key := farm.Hash64([]byte(keyStr))
	cm.Adapter.Release(key)
}

// Get retrieves a value from the cache by string key and decodes it into dest
func (cm *CacheManager) Get(key string, dest interface{}) bool {
	hashedKey := farm.Hash64([]byte(key))
	data, ok := cm.Adapter.Get(hashedKey)
	if !ok {
		return false
	}

	if err := json.Unmarshal(data, dest); err != nil {
		return false
	}
	return true
}

// Set stores a value in the cache with a string key and TTL
func (cm *CacheManager) Set(key string, value interface{}, ttl time.Duration) error {
	hashedKey := farm.Hash64([]byte(key))
	data, err := json.Marshal(value)
	if err != nil {
		return err
	}

	// Calculate expiration time
	expiration := time.Now().Add(ttl)
	cm.Adapter.Set(hashedKey, data, expiration)
	return nil
}
