package game

import (
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/epsilondelta/shot/db"
	"github.com/epsilondelta/shot/hub"
	"github.com/epsilondelta/shot/models"
	"github.com/redis/go-redis/v9"
)

// TimerManager manages per-game turn timers.
type TimerManager struct {
	mu     sync.Mutex
	timers map[string]*time.Timer // gameID -> timer
	rdb    *redis.Client
}

var TM *TimerManager

func NewTimerManager(rdb *redis.Client) *TimerManager {
	return &TimerManager{
		timers: make(map[string]*time.Timer),
		rdb:    rdb,
	}
}

// StartTimer starts or resets the turn timer for a game.
func (tm *TimerManager) StartTimer(gameID, roomID string, deadline int64) {
	tm.mu.Lock()
	defer tm.mu.Unlock()

	// Cancel existing timer
	if t, ok := tm.timers[gameID]; ok {
		t.Stop()
	}

	duration := time.Until(time.Unix(deadline, 0))
	if duration <= 0 {
		duration = 1 * time.Second
	}

	tm.timers[gameID] = time.AfterFunc(duration, func() {
		tm.handleTimeout(gameID, roomID, deadline)
	})
}

// StopTimer cancels the timer for a game.
func (tm *TimerManager) StopTimer(gameID string) {
	tm.mu.Lock()
	defer tm.mu.Unlock()

	if t, ok := tm.timers[gameID]; ok {
		t.Stop()
		delete(tm.timers, gameID)
	}
}

// ResetTimer resets the timer to a new deadline.
func (tm *TimerManager) ResetTimer(gameID, roomID string, deadline int64) {
	tm.StartTimer(gameID, roomID, deadline)
}

func (tm *TimerManager) handleTimeout(gameID, roomID string, expectedDeadline int64) {
	tm.mu.Lock()
	delete(tm.timers, gameID)
	tm.mu.Unlock()

	// Serialize with concurrent HTTP handlers: both sides do LoadState→mutate→SaveState.
	// Without this lock two goroutines can load the same snapshot and one silently
	// overwrites the other's write.
	GL.Lock(gameID)
	defer GL.Unlock(gameID)

	state, err := LoadState(tm.rdb, gameID)
	if err != nil {
		log.Printf("timer: failed to load state for game %s: %v", gameID, err)
		return
	}

	if state.Status != "playing" {
		return
	}

	// 턴이 이미 수동으로 종료된 경우(deadline이 변경됨) 중복 실행 방지
	if state.TurnDeadline != expectedDeadline {
		return
	}

	events, err := HandleTimeout(state)
	if err != nil {
		log.Printf("timer: failed to handle timeout for game %s: %v", gameID, err)
		return
	}

	// Broadcast events
	for _, e := range events {
		hub.H.BroadcastJSON(roomID, e)
	}

	// If game is still playing, start timer for next turn
	if state.Status == "playing" {
		tm.StartTimer(gameID, roomID, state.TurnDeadline)
	}
}

// RecoverTimers restores timers for all active games after server restart.
func (tm *TimerManager) RecoverTimers() {
	keys, err := tm.rdb.Keys(ctx, "game:*").Result()
	if err != nil {
		log.Printf("timer: failed to scan game keys: %v", err)
		return
	}

	for _, key := range keys {
		data, err := tm.rdb.Get(ctx, key).Bytes()
		if err != nil {
			continue
		}
		var state GameState
		if err := json.Unmarshal(data, &state); err != nil {
			continue
		}
		if state.Status != "playing" {
			continue
		}
		// Verify the room is still marked as playing in DB.
		// If the DB was updated (e.g. partial crash during endGame) but the Redis key
		// was not deleted, RecoverTimers would otherwise start a ghost timer that fires
		// against an already-finished game.
		var room models.Room
		if err := db.DB.Where("id = ? AND status = ?", state.RoomID, "playing").First(&room).Error; err != nil {
			tm.rdb.Del(ctx, key)
			log.Printf("timer: deleted stale Redis key for game %s (room %s not playing in DB)", state.GameID, state.RoomID)
			continue
		}
		// If deadline already passed, handle immediately with a short delay
		deadline := state.TurnDeadline
		if time.Unix(deadline, 0).Before(time.Now()) {
			deadline = time.Now().Add(2 * time.Second).Unix()
		}
		tm.StartTimer(state.GameID, state.RoomID, deadline)
		log.Printf("timer: recovered timer for game %s", state.GameID)
	}
}
