package handlers

import (
	"github.com/epsilondelta/shot/db"
	"github.com/epsilondelta/shot/models"
	"github.com/gofiber/fiber/v2"
)

// ListRooms GET /api/rooms
func ListRooms(c *fiber.Ctx) error {
	_, err := getUserIDFromToken(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	var rooms []models.Room
	db.DB.Where("status != ?", "finished").Order("created_at desc").Find(&rooms)

	result := make([]fiber.Map, len(rooms))
	for i, r := range rooms {
		result[i] = fiber.Map{
			"id":          r.ID,
			"name":        r.Name,
			"hostId":      r.HostID,
			"status":      r.Status,
			"maxPlayers":  r.MaxPlayers,
			"playerCount": r.PlayerCount,
			"createdAt":   r.CreatedAt,
		}
	}
	return c.JSON(result)
}

// CreateRoom POST /api/rooms
func CreateRoom(c *fiber.Ctx) error {
	userID, err := getUserIDFromToken(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	var body struct {
		Name       string `json:"name"`
		MaxPlayers int    `json:"maxPlayers"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}
	if body.Name == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "name is required"})
	}
	if body.MaxPlayers < 2 || body.MaxPlayers > 16 {
		body.MaxPlayers = 8
	}

	room := models.Room{
		Name:       body.Name,
		HostID:     userID,
		MaxPlayers: body.MaxPlayers,
	}
	if result := db.DB.Create(&room); result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to create room"})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"id":          room.ID,
		"name":        room.Name,
		"hostId":      room.HostID,
		"status":      room.Status,
		"maxPlayers":  room.MaxPlayers,
		"playerCount": room.PlayerCount,
		"createdAt":   room.CreatedAt,
	})
}
