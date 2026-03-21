package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"

	"github.com/epsilondelta/shot/db"
	"github.com/epsilondelta/shot/hub"
	"github.com/epsilondelta/shot/models"
	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

func getUserIDFromToken(c *fiber.Ctx) (string, error) {
	authHeader := c.Get("Authorization")
	if len(authHeader) < 8 || authHeader[:7] != "Bearer " {
		return "", fiber.ErrUnauthorized
	}
	tokenStr := authHeader[7:]
	token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return getJWTSecret(), nil
	})
	if err != nil || !token.Valid {
		return "", fiber.ErrUnauthorized
	}
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return "", fiber.ErrUnauthorized
	}
	userID, _ := claims["sub"].(string)
	return userID, nil
}

func generateAPIKey() (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return "mr_" + hex.EncodeToString(b), nil
}

// ListBots GET /api/bots
func ListBots(c *fiber.Ctx) error {
	userID, err := getUserIDFromToken(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	var bots []models.Bot
	db.DB.Where("user_id = ?", userID).Order("created_at desc").Find(&bots)

	result := make([]fiber.Map, len(bots))
	for i, bot := range bots {
		isInGame := false
		roomName := ""
		var room models.Room
		err := db.DB.Joins("JOIN room_members ON room_members.room_id = rooms.id").
			Where("room_members.bot_id = ? AND rooms.status = ?", bot.ID, "playing").
			First(&room).Error
		if err == nil {
			isInGame = true
			roomName = room.Name
		}
		result[i] = fiber.Map{
			"id":          bot.ID,
			"name":        bot.Name,
			"avatarUrl":   bot.AvatarURL,
			"description": bot.Description,
			"isOnline":    IsBotOnline(bot.ID),
			"isInGame":    isInGame,
			"roomName":    roomName,
			"createdAt":   bot.CreatedAt,
		}
	}
	return c.JSON(result)
}

// CreateBot POST /api/bots
func CreateBot(c *fiber.Ctx) error {
	userID, err := getUserIDFromToken(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	var body struct {
		Name        string `json:"name"`
		AvatarURL   string `json:"avatarUrl"`
		Description string `json:"description"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}
	if body.Name == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "name is required"})
	}

	apiKey, err := generateAPIKey()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to generate api key"})
	}

	bot := models.Bot{
		UserID:      userID,
		Name:        body.Name,
		AvatarURL:   body.AvatarURL,
		Description: body.Description,
		APIKey:      apiKey,
	}
	if result := db.DB.Create(&bot); result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to create bot"})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"id":        bot.ID,
		"name":      bot.Name,
		"avatarUrl": bot.AvatarURL,
		"apiKey":    bot.APIKey,
		"createdAt": bot.CreatedAt,
	})
}

// UpdateBot PATCH /api/bots/:id
func UpdateBot(c *fiber.Ctx) error {
	userID, err := getUserIDFromToken(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	botID := c.Params("id")
	var bot models.Bot
	if result := db.DB.Where("id = ? AND user_id = ?", botID, userID).First(&bot); result.Error != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "bot not found"})
	}

	var body struct {
		Name        *string `json:"name"`
		AvatarURL   *string `json:"avatarUrl"`
		Description *string `json:"description"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	updates := map[string]any{}
	if body.Name != nil && *body.Name != "" {
		updates["name"] = *body.Name
	}
	if body.AvatarURL != nil {
		updates["avatar_url"] = *body.AvatarURL
	}
	if body.Description != nil {
		updates["description"] = *body.Description
	}
	if len(updates) > 0 {
		db.DB.Model(&bot).Updates(updates)
	}

	return c.JSON(fiber.Map{
		"id":          bot.ID,
		"name":        bot.Name,
		"avatarUrl":   bot.AvatarURL,
		"description": bot.Description,
		"createdAt":   bot.CreatedAt,
	})
}

// RegenerateAPIKey POST /api/bots/:id/regenerate-key
func RegenerateAPIKey(c *fiber.Ctx) error {
	userID, err := getUserIDFromToken(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	botID := c.Params("id")
	var bot models.Bot
	if result := db.DB.Where("id = ? AND user_id = ?", botID, userID).First(&bot); result.Error != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "bot not found"})
	}

	newKey, err := generateAPIKey()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to generate api key"})
	}

	db.DB.Model(&bot).Update("api_key", newKey)

	// 기존 API Key로 연결된 SSE를 강제 종료
	hub.H.DisconnectBot(botID)

	return c.JSON(fiber.Map{
		"id":     bot.ID,
		"apiKey": newKey,
	})
}

// DeleteBot DELETE /api/bots/:id
func DeleteBot(c *fiber.Ctx) error {
	userID, err := getUserIDFromToken(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	botID := c.Params("id")

	// Find affected rooms before deleting so we can update their member counts.
	var members []models.RoomMember
	db.DB.Where("bot_id = ?", botID).Find(&members)

	result := db.DB.Where("id = ? AND user_id = ?", botID, userID).Delete(&models.Bot{})
	if result.RowsAffected == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "bot not found"})
	}

	// Clean up all room memberships for the deleted bot.
	db.DB.Where("bot_id = ?", botID).Delete(&models.RoomMember{})

	// Notify the bot's SSE connection so it unregisters from the room hub,
	// and broadcast updated member lists to any affected rooms.
	hub.H.PublishBotEvent(botID, map[string]any{"type": "kicked_from_room"})
	for _, m := range members {
		broadcastRoomUpdate(m.RoomID)
	}

	return c.SendStatus(fiber.StatusNoContent)
}
