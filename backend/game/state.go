package game

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

var ctx = context.Background()

// PlayerState represents a single player's state within a game.
type PlayerState struct {
	ID                 string   `json:"id"`     // UserID or BotID
	UserID             string   `json:"userId"` // always the user (owner for bots)
	BotID              string   `json:"botId,omitempty"`
	Role               string   `json:"role"`     // "agent" | "spy"
	HP                 int      `json:"hp"`
	MaxHP              int      `json:"maxHp"`
	Cards              []string `json:"cards"`
	IsJailed           bool     `json:"isJailed"`
	JailTurnsLeft      int      `json:"jailTurnsLeft"` // 1 = normal jail, 2 = friendly fire jail
	IsRevealed         bool     `json:"isRevealed"`    // identity publicly known
	IsConfirmedAgent   bool     `json:"isConfirmedAgent"`
	IsDead             bool     `json:"isDead"`
	HasAttackedThisTurn bool    `json:"hasAttackedThisTurn"`
	HasChatted         bool     `json:"hasChatted"`
	Username           string   `json:"username"`
	AvatarURL          string   `json:"avatarUrl"`
}

// GameState holds the full game state stored in Redis.
type GameState struct {
	GameID           string        `json:"gameId"`
	RoomID           string        `json:"roomId"`
	Status           string        `json:"status"` // "playing" | "finished"
	Players          []PlayerState `json:"players"`
	Deck             []string      `json:"deck"`
	Discard          []string      `json:"discard"`
	Banished         int           `json:"banished"`
	CurrentTurnIndex int           `json:"currentTurnIndex"`
	TurnOrder        []string      `json:"turnOrder"` // player IDs
	TurnCount        int           `json:"turnCount"`
	MaxTurns         int           `json:"maxTurns"`
	TurnDeadline     int64         `json:"turnDeadline"` // unix timestamp
	Phase            string        `json:"phase"`        // "draw" | "action" | "end"
	ActionSeq        int           `json:"actionSeq"`    // sequence counter for actions within a turn
}

// CurrentPlayerID returns the ID of the player whose turn it is.
func (s *GameState) CurrentPlayerID() string {
	if s.CurrentTurnIndex < 0 || s.CurrentTurnIndex >= len(s.TurnOrder) {
		return ""
	}
	return s.TurnOrder[s.CurrentTurnIndex]
}

// FindPlayer returns a pointer to the PlayerState for the given ID.
func (s *GameState) FindPlayer(id string) *PlayerState {
	for i := range s.Players {
		if s.Players[i].ID == id {
			return &s.Players[i]
		}
	}
	return nil
}

// AliveAgentCount returns the number of living agents.
func (s *GameState) AliveAgentCount() int {
	count := 0
	for _, p := range s.Players {
		if !p.IsDead && p.Role == "agent" {
			count++
		}
	}
	return count
}

// AliveSpyCount returns the number of living spies.
func (s *GameState) AliveSpyCount() int {
	count := 0
	for _, p := range s.Players {
		if !p.IsDead && p.Role == "spy" {
			count++
		}
	}
	return count
}

func redisKey(gameID string) string {
	return fmt.Sprintf("game:%s", gameID)
}

// SaveState persists the game state to Redis.
func SaveState(rdb *redis.Client, state *GameState) error {
	data, err := json.Marshal(state)
	if err != nil {
		return err
	}
	return rdb.Set(ctx, redisKey(state.GameID), data, 24*time.Hour).Err()
}

// LoadState retrieves the game state from Redis.
func LoadState(rdb *redis.Client, gameID string) (*GameState, error) {
	data, err := rdb.Get(ctx, redisKey(gameID)).Bytes()
	if err != nil {
		return nil, err
	}
	var state GameState
	if err := json.Unmarshal(data, &state); err != nil {
		return nil, err
	}
	return &state, nil
}

// DeleteState removes the game state from Redis.
func DeleteState(rdb *redis.Client, gameID string) error {
	return rdb.Del(ctx, redisKey(gameID)).Err()
}
