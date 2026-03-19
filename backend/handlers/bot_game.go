package handlers

import (
	"bufio"
	"context"
	"fmt"
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
func findBotActiveGame(botID string) (*models.Game, *models.RoomMember, error) {
	var member models.RoomMember
	if err := db.DB.Where("bot_id = ?", botID).First(&member).Error; err != nil {
		return nil, nil, fmt.Errorf("bot not in any room")
	}
	var room models.Room
	if err := db.DB.First(&room, "id = ?", member.RoomID).Error; err != nil {
		return nil, nil, fmt.Errorf("room not found")
	}
	if room.Status != "playing" {
		return nil, &member, fmt.Errorf("no active game")
	}
	var activeGame models.Game
	if err := db.DB.Where("room_id = ? AND status = ?", room.ID, "playing").First(&activeGame).Error; err != nil {
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

// BotSSE GET /api/bot/sse — SSE connection for bots
func BotSSE(c *fiber.Ctx) error {
	apiKey := c.Query("apiKey")
	if apiKey == "" {
		return c.Status(fiber.StatusUnauthorized).SendString("unauthorized")
	}
	var bot models.Bot
	if err := db.DB.Where("api_key = ?", apiKey).First(&bot).Error; err != nil {
		return c.Status(fiber.StatusUnauthorized).SendString("unauthorized")
	}

	// Find bot's room
	var member models.RoomMember
	if err := db.DB.Where("bot_id = ?", bot.ID).First(&member).Error; err != nil {
		return c.Status(fiber.StatusNotFound).SendString("bot not in any room")
	}

	roomID := member.RoomID

	client := &hub.Client{
		Ch:        make(chan []byte, 64),
		UserID:    bot.UserID, // owner ID
		Username:  bot.Name,
		AvatarURL: bot.AvatarURL,
		RoomID:    roomID,
	}
	hub.H.Register(client)

	// Mark bot online
	SetBotOnline(bot.ID)

	c.Set("Content-Type", "text/event-stream")
	c.Set("Cache-Control", "no-cache")
	c.Set("Connection", "keep-alive")
	c.Set("X-Accel-Buffering", "no")

	c.Context().SetBodyStreamWriter(func(w *bufio.Writer) {
		defer func() {
			hub.H.Unregister(client)
			SetBotOffline(bot.ID)
		}()

		ticker := time.NewTicker(15 * time.Second)
		defer ticker.Stop()

		// Heartbeat to keep online status alive
		heartbeat := time.NewTicker(10 * time.Second)
		defer heartbeat.Stop()

		for {
			select {
			case data, ok := <-client.Ch:
				if !ok {
					return
				}
				fmt.Fprintf(w, "data: %s\n\n", data)
				if err := w.Flush(); err != nil {
					return
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
