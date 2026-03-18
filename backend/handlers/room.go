package handlers

import (
	"time"

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
			"id":             r.ID,
			"name":           r.Name,
			"hostId":         r.HostID,
			"status":         r.Status,
			"maxPlayers":     r.MaxPlayers,
			"playerCount":    r.PlayerCount,
			"botCount":       r.BotCount,
			"spectatorCount": r.SpectatorCount,
			"isPrivate":      r.IsPrivate,
			"createdAt":      r.CreatedAt,
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
		IsPrivate  bool   `json:"isPrivate"`
		Password   string `json:"password"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}
	if body.Name == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "name is required"})
	}
	if body.IsPrivate && body.Password == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "password is required for private room"})
	}
	if body.MaxPlayers < 5 || body.MaxPlayers > 12 {
		body.MaxPlayers = 8
	}

	room := models.Room{
		Name:       body.Name,
		HostID:     userID,
		MaxPlayers: body.MaxPlayers,
		IsPrivate:  body.IsPrivate,
		Password:   body.Password,
	}
	if result := db.DB.Create(&room); result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to create room"})
	}

	// Auto-add creator as first member
	member := models.RoomMember{RoomID: room.ID, UserID: userID, JoinedAt: time.Now()}
	db.DB.Create(&member)

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"id":             room.ID,
		"name":           room.Name,
		"hostId":         room.HostID,
		"status":         room.Status,
		"maxPlayers":     room.MaxPlayers,
		"playerCount":    room.PlayerCount,
		"botCount":       room.BotCount,
		"spectatorCount": room.SpectatorCount,
		"isPrivate":      room.IsPrivate,
		"createdAt":      room.CreatedAt,
	})
}

// JoinRoom POST /api/rooms/:id/join
func JoinRoom(c *fiber.Ctx) error {
	userID, err := getUserIDFromToken(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	roomID := c.Params("id")
	var room models.Room
	if result := db.DB.First(&room, "id = ?", roomID); result.Error != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "room not found"})
	}

	if room.IsPrivate {
		var body struct {
			Password string `json:"password"`
		}
		if err := c.BodyParser(&body); err != nil || body.Password != room.Password {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "invalid password"})
		}
	}

	// Check if already a member
	var existing models.RoomMember
	if result := db.DB.First(&existing, "room_id = ? AND user_id = ?", roomID, userID); result.Error == nil {
		return c.JSON(fiber.Map{"ok": true})
	}

	member := models.RoomMember{RoomID: roomID, UserID: userID, JoinedAt: time.Now()}
	db.DB.Create(&member)
	db.DB.Model(&room).UpdateColumn("player_count", room.PlayerCount+1)

	return c.JSON(fiber.Map{"ok": true})
}

// GetRoomMembers GET /api/rooms/:id/members
func GetRoomMembers(c *fiber.Ctx) error {
	_, err := getUserIDFromToken(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	roomID := c.Params("id")

	type MemberRow struct {
		UserID    string
		Username  string
		AvatarURL string
		JoinedAt  time.Time
	}

	var rows []MemberRow
	db.DB.Raw(`
		SELECT rm.user_id, u.username, u.avatar_url, rm.joined_at
		FROM room_members rm
		JOIN users u ON u.id = rm.user_id
		WHERE rm.room_id = ?
		ORDER BY rm.joined_at ASC
	`, roomID).Scan(&rows)

	result := make([]fiber.Map, len(rows))
	for i, r := range rows {
		result[i] = fiber.Map{
			"userId":    r.UserID,
			"username":  r.Username,
			"avatarUrl": r.AvatarURL,
			"joinedAt":  r.JoinedAt,
		}
	}
	return c.JSON(result)
}
