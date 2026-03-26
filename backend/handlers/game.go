package handlers

import (
	"encoding/json"
	"time"

	"github.com/epsilondelta/shot/db"
	"github.com/epsilondelta/shot/game"
	"github.com/epsilondelta/shot/hub"
	"github.com/epsilondelta/shot/models"
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

// StartGame POST /api/rooms/:id/start
func StartGame(c *fiber.Ctx) error {
	userID, err := getUserIDFromToken(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	roomID := c.Params("id")
	var room models.Room
	if err := db.DB.First(&room, "id = ?", roomID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "room not found"})
	}
	if room.HostID != userID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "host only"})
	}
	if room.Status != "waiting" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "game already started"})
	}

	// Check minimum players
	var playerCount int64
	db.DB.Model(&models.RoomMember{}).Where("room_id = ? AND is_spectator = false", roomID).Count(&playerCount)
	if playerCount < 5 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "need at least 5 players"})
	}

	// Update room status before starting — prevents concurrent start attempts.
	db.DB.Model(&models.Room{}).Where("id = ?", roomID).Update("status", "playing")

	// LLM Player 크레딧 차감
	var llmMembers []models.RoomMember
	db.DB.Where("room_id = ? AND provided_model_id != ''", roomID).Find(&llmMembers)
	if len(llmMembers) > 0 {
		totalCost := 0
		for _, m := range llmMembers {
			var pm models.ProvidedModel
			if err := db.DB.First(&pm, "id = ?", m.ProvidedModelID).Error; err == nil {
				totalCost += pm.CreditCost
			}
		}
		if totalCost > 0 {
			var host models.User
			db.DB.First(&host, "id = ?", userID)
			if host.Credits < totalCost {
				db.DB.Model(&models.Room{}).Where("id = ?", roomID).Update("status", "waiting")
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "insufficient credits for LLM players"})
			}
			// 크레딧 차감
			db.DB.Model(&models.User{}).Where("id = ?", userID).Update("credits", gorm.Expr("credits - ?", totalCost))
			for _, m := range llmMembers {
				var pm models.ProvidedModel
				if err := db.DB.First(&pm, "id = ?", m.ProvidedModelID).Error; err == nil && pm.CreditCost > 0 {
					tx := models.CreditTransaction{
						UserID:      userID,
						Amount:      -pm.CreditCost,
						Type:        "use_llm",
						Description: "LLM Player 사용: " + pm.Name,
					}
					db.DB.Create(&tx)
				}
			}
		}
	}

	// Start game
	state, events, err := game.StartGame(roomID)
	if err != nil {
		// Rollback room status so the host can try again.
		db.DB.Model(&models.Room{}).Where("id = ?", roomID).Update("status", "waiting")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to start game"})
	}

	// Broadcast game_start with initial state
	hub.H.BroadcastJSON(roomID, map[string]any{
		"type":   "game_start",
		"gameId": state.GameID,
	})

	// Broadcast all initial events
	for _, e := range events {
		hub.H.BroadcastJSON(roomID, e)
	}

	// Start turn timer or auto-play if first player is a bot
	firstPlayer := state.FindPlayer(state.CurrentPlayerID())
	if firstPlayer != nil && firstPlayer.IsRuleBot {
		game.ScheduleRuleBotTurn(state, roomID, 1500*time.Millisecond)
	} else if firstPlayer != nil && firstPlayer.IsLLMPlayer {
		game.ScheduleLLMPlayerTurn(state, roomID, 1500*time.Millisecond)
	} else {
		game.TM.StartTimer(state.GameID, roomID, state.TurnDeadline)
	}

	return c.JSON(fiber.Map{"gameId": state.GameID})
}

// GamePlayCard POST /api/games/:id/play-card
func GamePlayCard(c *fiber.Ctx) error {
	userID, err := getUserIDFromToken(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	gameID := c.Params("id")

	game.GL.Lock(gameID)
	defer game.GL.Unlock(gameID)

	state, err := game.LoadState(db.RDB, gameID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "game not found"})
	}

	var body struct {
		CardType string `json:"cardType"`
		TargetID string `json:"targetId"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid body"})
	}

	// Resolve player ID (could be user or their bot)
	playerID := resolvePlayerID(state, userID)
	if playerID == "" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "not in game"})
	}

	events, err := game.PlayCard(state, playerID, body.CardType, body.TargetID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	// Broadcast events
	for _, e := range events {
		hub.H.BroadcastJSON(state.RoomID, e)
	}

	// game_end broadcast 후 봇 kick 처리
	game.ProcessPendingBotKicks(state)

	// Reset timer or schedule rule-bot
	if state.Status == "playing" {
		next := state.FindPlayer(state.CurrentPlayerID())
		if next != nil && next.IsRuleBot {
			game.ScheduleRuleBotTurn(state, state.RoomID, 1500*time.Millisecond)
		} else {
			game.TM.ResetTimer(gameID, state.RoomID, state.TurnDeadline)
		}
	} else {
		game.TM.StopTimer(gameID)
	}

	return c.JSON(fiber.Map{"ok": true})
}

// GameEndTurn POST /api/games/:id/end-turn
func GameEndTurn(c *fiber.Ctx) error {
	userID, err := getUserIDFromToken(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	gameID := c.Params("id")

	game.GL.Lock(gameID)
	defer game.GL.Unlock(gameID)

	state, err := game.LoadState(db.RDB, gameID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "game not found"})
	}

	playerID := resolvePlayerID(state, userID)
	if playerID == "" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "not in game"})
	}

	events, err := game.EndTurn(state, playerID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	for _, e := range events {
		hub.H.BroadcastJSON(state.RoomID, e)
	}

	// game_end broadcast 후 봇 kick 처리
	game.ProcessPendingBotKicks(state)

	if state.Status == "playing" {
		next := state.FindPlayer(state.CurrentPlayerID())
		if next != nil && next.IsRuleBot {
			game.ScheduleRuleBotTurn(state, state.RoomID, 1500*time.Millisecond)
		} else {
			game.TM.StartTimer(gameID, state.RoomID, state.TurnDeadline)
		}
	} else {
		game.TM.StopTimer(gameID)
	}

	return c.JSON(fiber.Map{"ok": true})
}

// GameReveal POST /api/games/:id/reveal
func GameReveal(c *fiber.Ctx) error {
	userID, err := getUserIDFromToken(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	gameID := c.Params("id")

	game.GL.Lock(gameID)
	defer game.GL.Unlock(gameID)

	state, err := game.LoadState(db.RDB, gameID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "game not found"})
	}

	playerID := resolvePlayerID(state, userID)
	if playerID == "" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "not in game"})
	}

	events, err := game.RevealIdentity(state, playerID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	for _, e := range events {
		hub.H.BroadcastJSON(state.RoomID, e)
	}

	game.TM.ResetTimer(gameID, state.RoomID, state.TurnDeadline)

	return c.JSON(fiber.Map{"ok": true})
}

// GameChat POST /api/games/:id/chat
func GameChat(c *fiber.Ctx) error {
	userID, err := getUserIDFromToken(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	gameID := c.Params("id")

	game.GL.Lock(gameID)
	defer game.GL.Unlock(gameID)

	state, err := game.LoadState(db.RDB, gameID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "game not found"})
	}

	var body struct {
		Message string `json:"message"`
	}
	if err := c.BodyParser(&body); err != nil || body.Message == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid body"})
	}

	playerID := resolvePlayerID(state, userID)
	if playerID == "" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "not in game"})
	}

	events, err := game.SendChat(state, playerID, body.Message)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	for _, e := range events {
		hub.H.BroadcastJSON(state.RoomID, e)
	}

	return c.JSON(fiber.Map{"ok": true})
}

// GameState GET /api/games/:id/state
func GetGameState(c *fiber.Ctx) error {
	userID, err := getUserIDFromToken(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	gameID := c.Params("id")
	state, err := game.LoadState(db.RDB, gameID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "game not found"})
	}

	// Verify player is in the game (or spectating)
	playerID := resolvePlayerID(state, userID)
	if playerID == "" {
		// Check if user is a spectator in the room
		var spectator models.RoomMember
		if err := db.DB.Where("room_id = ? AND user_id = ? AND bot_id = '' AND is_spectator = true", state.RoomID, userID).First(&spectator).Error; err != nil {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "not in game"})
		}
		// Spectator: return state with no role visibility (all unknown)
		return c.JSON(buildClientState(state, ""))
	}

	// Return state with role visibility rules
	return c.JSON(buildClientState(state, playerID))
}

// GameLeave POST /api/games/:id/leave
func GameLeave(c *fiber.Ctx) error {
	userID, err := getUserIDFromToken(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	gameID := c.Params("id")
	state, err := game.LoadState(db.RDB, gameID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "game not found"})
	}

	playerID := resolvePlayerID(state, userID)
	if playerID == "" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "not in game"})
	}

	player := state.FindPlayer(playerID)
	if player == nil || !player.IsDead {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "only dead players can leave"})
	}

	// Remove dead player from room so they don't get pulled back on refresh
	db.DB.Where("room_id = ? AND user_id = ? AND bot_id = ''", state.RoomID, userID).Delete(&models.RoomMember{})

	return c.JSON(fiber.Map{"ok": true})
}

// resolvePlayerID finds the player ID for a user in the game.
// A user might be playing as themselves or own a bot in the game.
func resolvePlayerID(state *game.GameState, userID string) string {
	for _, p := range state.Players {
		if p.BotID == "" && p.UserID == userID {
			return p.ID
		}
	}
	return ""
}

// buildClientState creates a view of the game state appropriate for a specific player.
func buildClientState(state *game.GameState, viewerID string) fiber.Map {
	viewer := state.FindPlayer(viewerID)

	players := make([]fiber.Map, len(state.Players))
	for i, p := range state.Players {
		pm := fiber.Map{
			"id":               p.ID,
			"username":         p.Username,
			"avatarUrl":        p.AvatarURL,
			"hp":               p.HP,
			"maxHp":            p.MaxHP,
			"cards":            p.Cards, // all cards are public
			"isJailed":         p.IsJailed,
			"isDead":           p.IsDead,
			"isRevealed":       p.IsRevealed,
			"isConfirmedAgent": p.IsConfirmedAgent,
			"hasChatted":       p.HasChatted,
			"botId":            p.BotID,
		}
		if p.BotID != "" && !game.IsRuleBotID(p.BotID) {
			pm["isOnline"] = IsBotOnline(p.BotID)
		}
		if p.IsRuleBot {
			pm["isRuleBot"] = true
			pm["isOnline"] = true
		}

		// Role visibility — reveal all roles when game is finished
		if state.Status == "finished" {
			pm["role"] = p.Role
		} else if p.ID == viewerID {
			pm["role"] = p.Role
		} else if p.IsRevealed || p.IsConfirmedAgent || p.IsDead {
			pm["role"] = p.Role
		} else if viewer != nil && viewer.Role == "spy" && p.Role == "spy" {
			pm["role"] = "spy" // spies see each other
		} else {
			pm["role"] = "unknown"
		}

		players[i] = pm
	}

	// 채팅 기록 조회
	var chatActions []models.GameAction
	db.DB.Where("game_id = ? AND action_type = ?", state.GameID, "game_chat").
		Order("created_at ASC").Find(&chatActions)
	chatLog := make([]fiber.Map, 0, len(chatActions))
	for _, a := range chatActions {
		var payload map[string]any
		json.Unmarshal([]byte(a.Payload), &payload)
		chatLog = append(chatLog, fiber.Map{
			"actorId": a.ActorID,
			"payload": payload,
		})
	}

	return fiber.Map{
		"gameId":           state.GameID,
		"roomId":           state.RoomID,
		"status":           state.Status,
		"result":           state.Result,
		"myId":             viewerID,
		"players":          players,
		"myPlayerId":       viewerID,
		"currentPlayerID":  state.CurrentPlayerID(),
		"turnCount":        state.TurnCount,
		"maxTurns":         state.MaxTurns,
		"turnDeadline":     state.TurnDeadline,
		"phase":            state.Phase,
		"deckCount":        len(state.Deck),
		"discardCount":     len(state.Discard),
		"banishedCount":    state.Banished,
		"chatLog":          chatLog,
	}
}
