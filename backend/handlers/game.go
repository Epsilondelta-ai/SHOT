package handlers

import (
	"github.com/epsilondelta/shot/db"
	"github.com/epsilondelta/shot/game"
	"github.com/epsilondelta/shot/hub"
	"github.com/epsilondelta/shot/models"
	"github.com/gofiber/fiber/v2"
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

	// Update room status
	db.DB.Model(&models.Room{}).Where("id = ?", roomID).Update("status", "playing")

	// Start game
	state, events, err := game.StartGame(roomID)
	if err != nil {
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

	// Start turn timer
	game.TM.StartTimer(state.GameID, roomID, state.TurnDeadline)

	return c.JSON(fiber.Map{"gameId": state.GameID})
}

// GamePlayCard POST /api/games/:id/play-card
func GamePlayCard(c *fiber.Ctx) error {
	userID, err := getUserIDFromToken(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	gameID := c.Params("id")
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

	// Reset timer
	if state.Status == "playing" {
		game.TM.ResetTimer(gameID, state.RoomID, state.TurnDeadline)
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

	if state.Status == "playing" {
		game.TM.StartTimer(gameID, state.RoomID, state.TurnDeadline)
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

	// Verify player is in the game
	playerID := resolvePlayerID(state, userID)
	if playerID == "" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "not in game"})
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
		}

		// Role visibility
		if p.ID == viewerID {
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

	return fiber.Map{
		"gameId":           state.GameID,
		"roomId":           state.RoomID,
		"status":           state.Status,
		"players":          players,
		"currentPlayerID":  state.CurrentPlayerID(),
		"turnCount":        state.TurnCount,
		"maxTurns":         state.MaxTurns,
		"turnDeadline":     state.TurnDeadline,
		"phase":            state.Phase,
		"deckCount":        len(state.Deck),
		"discardCount":     len(state.Discard),
		"banishedCount":    state.Banished,
	}
}
