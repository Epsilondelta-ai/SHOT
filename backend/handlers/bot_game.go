package handlers

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"sync/atomic"
	"time"

	"github.com/epsilondelta/shot/db"
	"github.com/epsilondelta/shot/game"
	"github.com/epsilondelta/shot/hub"
	"github.com/epsilondelta/shot/models"
	"github.com/gofiber/fiber/v2"
)

var rctx = context.Background()

// getBotFromAPIKey authenticates a bot using X-API-Key header.
func getBotFromAPIKey(c *fiber.Ctx) (*models.Bot, error) {
	apiKey := c.Get("X-API-Key")
	if apiKey == "" {
		return nil, fiber.ErrUnauthorized
	}
	var bot models.Bot
	if err := db.DB.Where("api_key = ?", apiKey).First(&bot).Error; err != nil {
		return nil, fiber.ErrUnauthorized
	}
	return &bot, nil
}

// findBotActiveGame finds the active game for a bot by looking up its room membership.
// Joins rooms so that stale RoomMember rows from finished/waiting rooms are ignored —
// only a membership in a currently-playing room qualifies.
func findBotActiveGame(botID string) (*models.Game, *models.RoomMember, error) {
	var member models.RoomMember
	if err := db.DB.
		Joins("JOIN rooms ON rooms.id = room_members.room_id").
		Where("room_members.bot_id = ? AND rooms.status = ?", botID, "playing").
		First(&member).Error; err != nil {
		return nil, nil, fmt.Errorf("no active game")
	}
	var activeGame models.Game
	if err := db.DB.Where("room_id = ? AND status = ?", member.RoomID, "playing").First(&activeGame).Error; err != nil {
		return nil, &member, fmt.Errorf("game not found")
	}
	return &activeGame, &member, nil
}

func botOnlineKey(botID string) string {
	return "bot:online:" + botID
}

// SetBotOnline marks a bot as online in Redis with TTL.
func SetBotOnline(botID string) {
	db.RDB.Set(rctx, botOnlineKey(botID), "1", 30*time.Second)
}

// SetBotOffline removes bot online status from Redis.
func SetBotOffline(botID string) {
	db.RDB.Del(rctx, botOnlineKey(botID))
}

// IsBotOnline checks if a bot is currently online.
func IsBotOnline(botID string) bool {
	val, err := db.RDB.Exists(rctx, botOnlineKey(botID)).Result()
	return err == nil && val > 0
}

// BotSSE GET /api/bot/sse — SSE connection for bots.
// Bots can connect without being in a room (lobby mode).
// When invited to a room, the bot receives an "invited_to_room" event
// and is automatically registered to the room's hub for game events.
func BotSSE(c *fiber.Ctx) error {
	apiKey := c.Query("apiKey")
	if apiKey == "" {
		return c.Status(fiber.StatusUnauthorized).SendString("unauthorized")
	}
	var bot models.Bot
	if err := db.DB.Where("api_key = ?", apiKey).First(&bot).Error; err != nil {
		return c.Status(fiber.StatusUnauthorized).SendString("unauthorized")
	}

	client := &hub.Client{
		Ch:        make(chan []byte, 64),
		UserID:    bot.UserID, // owner ID
		Username:  bot.Name,
		AvatarURL: bot.AvatarURL,
	}

	// Register bot for personal events (bot:events:{botID}).
	// RegisterBot marks the old client as Replaced and returns it WITHOUT closing its
	// channel. We must unregister the old client from the room hub first (acquires
	// mu.Lock) so that sendToLocalClients can no longer pick it up, and only then
	// close its channel — avoiding a "send on closed channel" panic.
	oldClient := hub.H.RegisterBot(bot.ID, client)
	if oldClient != nil {
		if oldClient.RoomID != "" {
			hub.H.Unregister(oldClient)
		}
		close(oldClient.Ch)
	}

	// If bot is already in a room, register to that room's hub.
	var member models.RoomMember
	if err := db.DB.Where("bot_id = ?", bot.ID).First(&member).Error; err == nil {
		client.RoomID = member.RoomID
		hub.H.Register(client)
		broadcastRoomUpdate(member.RoomID)
	}

	SetBotOnline(bot.ID)

	c.Set("Content-Type", "text/event-stream")
	c.Set("Cache-Control", "no-cache")
	c.Set("Connection", "keep-alive")
	c.Set("X-Accel-Buffering", "no")

	c.Context().SetBodyStreamWriter(func(w *bufio.Writer) {
		defer func() {
			// Skip cleanup if this connection was superseded by a newer one;
			// the new connection already owns the bot/room registrations.
			if client.Replaced {
				return
			}
			if client.RoomID != "" {
				hub.H.Unregister(client)
				broadcastRoomUpdate(client.RoomID)
			}
			hub.H.UnregisterBot(bot.ID, client)
			SetBotOffline(bot.ID)
		}()

		ticker := time.NewTicker(15 * time.Second)
		defer ticker.Stop()

		heartbeat := time.NewTicker(10 * time.Second)
		defer heartbeat.Stop()

		for {
			select {
			case data, ok := <-client.Ch:
				if !ok {
					return
				}
				// Handle room switching based on event type
				var envelope struct {
					Type   string `json:"type"`
					RoomID string `json:"roomId,omitempty"`
				}
				if json.Unmarshal(data, &envelope) == nil {
					switch envelope.Type {
					case "invited_to_room":
						if client.RoomID != "" {
							hub.H.Unregister(client)
						}
						client.RoomID = envelope.RoomID
						hub.H.Register(client)
						broadcastRoomUpdate(envelope.RoomID)
					case "kicked_from_room", "room_closed":
						if client.RoomID != "" {
							hub.H.Unregister(client)
							client.RoomID = ""
						}
					}
				}
				fmt.Fprintf(w, "data: %s\n\n", data)
				if err := w.Flush(); err != nil {
					return
				}
				// If messages were dropped while channel was full, tell the bot to resync.
				if atomic.CompareAndSwapInt32(&client.NeedsResync, 1, 0) {
					resync, _ := json.Marshal(map[string]string{"type": "resync_needed"})
					fmt.Fprintf(w, "data: %s\n\n", resync)
					w.Flush() //nolint:errcheck
				}
			case <-ticker.C:
				fmt.Fprintf(w, ": ping\n\n")
				if err := w.Flush(); err != nil {
					return
				}
			case <-heartbeat.C:
				SetBotOnline(bot.ID)
			}
		}
	})

	return nil
}

// BotGetGameActions GET /api/bot/game/actions
func BotGetGameActions(c *fiber.Ctx) error {
	bot, err := getBotFromAPIKey(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	activeGame, _, err := findBotActiveGame(bot.ID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error()})
	}

	sinceStr := c.Query("since", "0")
	sinceTurn := 0
	fmt.Sscanf(sinceStr, "%d", &sinceTurn)

	var actions []models.GameAction
	db.DB.Where("game_id = ? AND turn >= ?", activeGame.ID, sinceTurn).
		Order("turn ASC, seq ASC").
		Find(&actions)

	result := make([]fiber.Map, len(actions))
	for i, a := range actions {
		result[i] = fiber.Map{
			"turn":     a.Turn,
			"seq":      a.Seq,
			"type":     a.ActionType,
			"actorId":  a.ActorID,
			"targetId": a.TargetID,
			"payload":  a.Payload,
		}
	}

	return c.JSON(result)
}

// BotGetGameState GET /api/bot/game/state
func BotGetGameState(c *fiber.Ctx) error {
	bot, err := getBotFromAPIKey(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	activeGame, _, err := findBotActiveGame(bot.ID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error()})
	}

	state, err := game.LoadState(db.RDB, activeGame.ID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "game state not found"})
	}

	return c.JSON(buildClientState(state, bot.ID))
}

// BotPlayCard POST /api/bot/game/play-card
func BotPlayCard(c *fiber.Ctx) error {
	bot, err := getBotFromAPIKey(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	activeGame, _, err := findBotActiveGame(bot.ID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error()})
	}

	state, err := game.LoadState(db.RDB, activeGame.ID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "game state not found"})
	}

	var body struct {
		CardType string `json:"cardType"`
		TargetID string `json:"targetId"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid body"})
	}

	events, err := game.PlayCard(state, bot.ID, body.CardType, body.TargetID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	for _, e := range events {
		hub.H.BroadcastJSON(state.RoomID, e)
	}

	if state.Status == "playing" {
		game.TM.ResetTimer(activeGame.ID, state.RoomID, state.TurnDeadline)
	} else {
		game.TM.StopTimer(activeGame.ID)
	}

	return c.JSON(fiber.Map{"ok": true})
}

// BotEndTurn POST /api/bot/game/end-turn
func BotEndTurn(c *fiber.Ctx) error {
	bot, err := getBotFromAPIKey(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	activeGame, _, err := findBotActiveGame(bot.ID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error()})
	}

	state, err := game.LoadState(db.RDB, activeGame.ID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "game state not found"})
	}

	events, err := game.EndTurn(state, bot.ID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	for _, e := range events {
		hub.H.BroadcastJSON(state.RoomID, e)
	}

	if state.Status == "playing" {
		game.TM.StartTimer(activeGame.ID, state.RoomID, state.TurnDeadline)
	} else {
		game.TM.StopTimer(activeGame.ID)
	}

	return c.JSON(fiber.Map{"ok": true})
}

// BotReveal POST /api/bot/game/reveal
func BotReveal(c *fiber.Ctx) error {
	bot, err := getBotFromAPIKey(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	activeGame, _, err := findBotActiveGame(bot.ID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error()})
	}

	state, err := game.LoadState(db.RDB, activeGame.ID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "game state not found"})
	}

	events, err := game.RevealIdentity(state, bot.ID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	for _, e := range events {
		hub.H.BroadcastJSON(state.RoomID, e)
	}

	game.TM.ResetTimer(activeGame.ID, state.RoomID, state.TurnDeadline)

	return c.JSON(fiber.Map{"ok": true})
}

// BotChat POST /api/bot/game/chat
func BotChat(c *fiber.Ctx) error {
	bot, err := getBotFromAPIKey(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	activeGame, _, err := findBotActiveGame(bot.ID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error()})
	}

	state, err := game.LoadState(db.RDB, activeGame.ID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "game state not found"})
	}

	var body struct {
		Message string `json:"message"`
	}
	if err := c.BodyParser(&body); err != nil || body.Message == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid body"})
	}

	events, err := game.SendChat(state, bot.ID, body.Message)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	for _, e := range events {
		hub.H.BroadcastJSON(state.RoomID, e)
	}

	return c.JSON(fiber.Map{"ok": true})
}
