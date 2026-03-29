package handlers

import (
	"fmt"
	"time"

	"github.com/epsilondelta/shot/db"
	"github.com/epsilondelta/shot/game"
	"github.com/epsilondelta/shot/hub"
	"github.com/epsilondelta/shot/models"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// ListRooms GET /api/rooms
func ListRooms(c *fiber.Ctx) error {
	_, err := getUserIDFromToken(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	var rooms []models.Room
	db.DB.Where("status != ? AND is_quick_match = ?", "finished", false).Order("created_at desc").Find(&rooms)

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
			"isQuickMatch":   r.IsQuickMatch,
			"createdAt":      r.CreatedAt,
		}
	}
	return c.JSON(result)
}

// GetRoom GET /api/rooms/:id
func GetRoom(c *fiber.Ctx) error {
	_, err := getUserIDFromToken(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	roomID := c.Params("id")
	var room models.Room
	if err := db.DB.First(&room, "id = ?", roomID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "room not found"})
	}

	return c.JSON(fiber.Map{
		"id":             room.ID,
		"name":           room.Name,
		"hostId":         room.HostID,
		"status":         room.Status,
		"maxPlayers":     room.MaxPlayers,
		"playerCount":    room.PlayerCount,
		"botCount":       room.BotCount,
		"spectatorCount": room.SpectatorCount,
		"isPrivate":      room.IsPrivate,
		"isQuickMatch":   room.IsQuickMatch,
		"createdAt":      room.CreatedAt,
	})
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
	body.MaxPlayers = 12

	passwordHash := ""
	if body.IsPrivate {
		hash, err := bcrypt.GenerateFromPassword([]byte(body.Password), bcrypt.DefaultCost)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to hash password"})
		}
		passwordHash = string(hash)
	}

	room := models.Room{
		Name:       body.Name,
		HostID:     userID,
		MaxPlayers: body.MaxPlayers,
		IsPrivate:  body.IsPrivate,
		Password:   passwordHash,
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
		"isQuickMatch":   room.IsQuickMatch,
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

	// Check if already a member (e.g. room creator rejoining their own room)
	var existing models.RoomMember
	db.DB.Where("room_id = ? AND user_id = ? AND bot_id = ''", roomID, userID).Limit(1).Find(&existing)
	if existing.RoomID != "" {
		return c.JSON(fiber.Map{"ok": true})
	}

	if room.IsPrivate {
		var body struct {
			Password string `json:"password"`
		}
		if err := c.BodyParser(&body); err != nil {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "invalid password"})
		}
		if err := bcrypt.CompareHashAndPassword([]byte(room.Password), []byte(body.Password)); err != nil {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "invalid password"})
		}
	}

	member := models.RoomMember{RoomID: roomID, UserID: userID, JoinedAt: time.Now()}
	db.DB.Create(&member)
	syncRoomCounts(roomID)

	return c.JSON(fiber.Map{"ok": true})
}

// GetRoomMembers GET /api/rooms/:id/members
func GetRoomMembers(c *fiber.Ctx) error {
	_, err := getUserIDFromToken(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}
	roomID := c.Params("id")
	return c.JSON(buildMemberInfoList(roomID))
}

// SpectateRoom POST /api/rooms/:id/spectate (body: {"spectate": true/false})
func SpectateRoom(c *fiber.Ctx) error {
	userID, err := getUserIDFromToken(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}
	roomID := c.Params("id")
	var body struct {
		Spectate bool `json:"spectate"`
	}
	c.BodyParser(&body)

	var member models.RoomMember
	if err := db.DB.Where("room_id = ? AND user_id = ? AND bot_id = ''", roomID, userID).First(&member).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "not a member"})
	}

	if member.IsSpectator == body.Spectate {
		return c.JSON(fiber.Map{"ok": true})
	}

	db.DB.Model(&member).Update("is_spectator", body.Spectate)
	if body.Spectate {
		db.DB.Model(&models.Room{}).Where("id = ?", roomID).UpdateColumn("player_count", gorm.Expr("player_count - 1"))
		db.DB.Model(&models.Room{}).Where("id = ?", roomID).UpdateColumn("spectator_count", gorm.Expr("spectator_count + 1"))
	} else {
		db.DB.Model(&models.Room{}).Where("id = ?", roomID).UpdateColumn("player_count", gorm.Expr("player_count + 1"))
		db.DB.Model(&models.Room{}).Where("id = ?", roomID).UpdateColumn("spectator_count", gorm.Expr("spectator_count - 1"))
	}

	broadcastRoomUpdate(roomID)
	return c.JSON(fiber.Map{"ok": true})
}

// InviteBot POST /api/rooms/:id/invite-bot (body: {"botId": "..."})
func InviteBot(c *fiber.Ctx) error {
	userID, err := getUserIDFromToken(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}
	roomID := c.Params("id")

	// Check if user has permission (host or canInviteBots)
	var member models.RoomMember
	if err := db.DB.Where("room_id = ? AND user_id = ? AND bot_id = ''", roomID, userID).First(&member).Error; err != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "not a member"})
	}
	var room models.Room
	db.DB.First(&room, "id = ?", roomID)
	if room.HostID != userID && !member.CanInviteBots {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "no permission"})
	}

	var body struct {
		BotID string `json:"botId"`
	}
	if err := c.BodyParser(&body); err != nil || body.BotID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "botId required"})
	}

	// Verify bot belongs to user
	var bot models.Bot
	if err := db.DB.Where("id = ? AND user_id = ?", body.BotID, userID).First(&bot).Error; err != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "bot not found"})
	}

	// Check if bot already in room
	var existing models.RoomMember
	if db.DB.Where("room_id = ? AND bot_id = ?", roomID, body.BotID).First(&existing).Error == nil {
		return c.JSON(fiber.Map{"ok": true})
	}

	// Check if bot is online
	if !IsBotOnline(body.BotID) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "bot is offline"})
	}

	// Check if bot is busy in an active game in another room.
	// Join rooms so stale RoomMember rows from finished/waiting rooms don't block re-invitation.
	var busyMember models.RoomMember
	if db.DB.
		Joins("JOIN rooms ON rooms.id = room_members.room_id").
		Where("room_members.bot_id = ? AND rooms.status = ?", body.BotID, "playing").
		First(&busyMember).Error == nil {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "bot is in an active game"})
	}

	// Check room capacity
	if room.PlayerCount >= room.MaxPlayers {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "room is full"})
	}

	botMember := models.RoomMember{
		RoomID:   roomID,
		UserID:   userID, // owner's ID
		BotID:    body.BotID,
		JoinedAt: time.Now(),
	}
	db.DB.Create(&botMember)
	broadcastRoomUpdate(roomID)

	// 봇 클라이언트를 room hub에 동기적으로 등록 (초대 직후 게임 시작 시 이벤트 유실 방지)
	hub.H.RegisterBotToRoom(body.BotID, roomID)

	// Redis를 통한 알림 (다른 서버 인스턴스에서 봇이 연결되어 있을 수 있음)
	hub.H.PublishBotEvent(body.BotID, map[string]any{
		"type":   "invited_to_room",
		"roomId": roomID,
	})

	return c.JSON(fiber.Map{"ok": true})
}

// SetMemberPermission PATCH /api/rooms/:id/members/:userId/permissions (host only)
func SetMemberPermission(c *fiber.Ctx) error {
	userID, err := getUserIDFromToken(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}
	roomID := c.Params("id")
	targetUserID := c.Params("userId")

	var room models.Room
	if err := db.DB.First(&room, "id = ?", roomID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "room not found"})
	}
	if room.HostID != userID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "host only"})
	}

	var body struct {
		CanInviteBots bool `json:"canInviteBots"`
	}
	c.BodyParser(&body)

	db.DB.Model(&models.RoomMember{}).Where("room_id = ? AND user_id = ? AND bot_id = ''", roomID, targetUserID).
		Update("can_invite_bots", body.CanInviteBots)

	broadcastRoomUpdate(roomID)
	return c.JSON(fiber.Map{"ok": true})
}

// TransferHost POST /api/rooms/:id/transfer-host (host only)
func TransferHost(c *fiber.Ctx) error {
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

	var body struct {
		TargetUserID string `json:"targetUserId"`
	}
	if err := c.BodyParser(&body); err != nil || body.TargetUserID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "targetUserId required"})
	}

	// Verify target is a non-bot member
	var targetMember models.RoomMember
	if err := db.DB.Where("room_id = ? AND user_id = ? AND bot_id = ''", roomID, body.TargetUserID).First(&targetMember).Error; err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "target not a member"})
	}

	db.DB.Model(&models.Room{}).Where("id = ?", roomID).Update("host_id", body.TargetUserID)
	broadcastRoomUpdate(roomID)
	return c.JSON(fiber.Map{"ok": true})
}

// UpdateRoom PATCH /api/rooms/:id (host only)
func UpdateRoom(c *fiber.Ctx) error {
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

	var body struct {
		Name       string `json:"name"`
		MaxPlayers int    `json:"maxPlayers"`
		IsPrivate  bool   `json:"isPrivate"`
		Password   string `json:"password"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid body"})
	}
	if body.Name == "" {
		body.Name = room.Name
	}
	if body.MaxPlayers < 5 || body.MaxPlayers > 12 {
		body.MaxPlayers = room.MaxPlayers
	}
	if body.IsPrivate && body.Password == "" {
		body.Password = room.Password // keep existing hash unchanged
	} else if body.IsPrivate && body.Password != "" {
		hash, err := bcrypt.GenerateFromPassword([]byte(body.Password), bcrypt.DefaultCost)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to hash password"})
		}
		body.Password = string(hash)
	}

	updates := map[string]any{
		"name":        body.Name,
		"max_players": body.MaxPlayers,
		"is_private":  body.IsPrivate,
		"password":    body.Password,
	}
	db.DB.Model(&models.Room{}).Where("id = ?", roomID).Updates(updates)
	broadcastRoomUpdate(roomID)
	return c.JSON(fiber.Map{"ok": true})
}

// KickFromRoom POST /api/rooms/:id/kick
func KickFromRoom(c *fiber.Ctx) error {
	userID, err := getUserIDFromToken(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}
	roomID := c.Params("id")

	var room models.Room
	if err := db.DB.First(&room, "id = ?", roomID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "room not found"})
	}
	var body struct {
		TargetUserID string `json:"targetUserId"`
		BotID        string `json:"botId"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid body"})
	}

	if body.BotID != "" {
		// Bot owner or host can kick their own bot
		var member models.RoomMember
		if err := db.DB.Where("room_id = ? AND bot_id = ?", roomID, body.BotID).First(&member).Error; err != nil {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "bot not in room"})
		}
		if room.HostID != userID && member.UserID != userID {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "forbidden"})
		}
		db.DB.Where("room_id = ? AND bot_id = ?", roomID, body.BotID).Delete(&models.RoomMember{})

		// 룰봇은 SSE 연결이 없으므로 kick 이벤트 불필요
		if !game.IsRuleBotID(body.BotID) {
			hub.H.PublishBotEvent(body.BotID, map[string]any{
				"type":   "kicked_from_room",
				"roomId": roomID,
			})
		}
	} else if body.TargetUserID != "" && body.TargetUserID != userID {
		if room.HostID != userID {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "host only"})
		}
		// Delete from DB first, then close WS to avoid race with disconnect handler
		db.DB.Where("room_id = ? AND user_id = ? AND bot_id = ''", roomID, body.TargetUserID).Delete(&models.RoomMember{})
		hub.H.KickClient(roomID, body.TargetUserID)
	} else {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid target"})
	}

	broadcastRoomUpdate(roomID)
	return c.JSON(fiber.Map{"ok": true})
}

// LeaveRoom POST /api/rooms/:id/leave
func LeaveRoom(c *fiber.Ctx) error {
	// Support both Bearer token (normal leave) and query param token (sendBeacon on unload)
	var userID string
	var err error
	if tokenStr := c.Query("token"); tokenStr != "" {
		userID, err = parseUserIDFromToken(tokenStr)
	} else {
		userID, err = getUserIDFromToken(c)
	}
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}
	roomID := c.Params("id")

	// Check if the room has an active game — if so, don't destroy room/members
	var room models.Room
	db.DB.First(&room, "id = ?", roomID)
	if room.Status == "playing" {
		// Game in progress: close SSE but preserve room and members
		hub.H.CloseClient(roomID, userID, false)
		return c.JSON(fiber.Map{"ok": true})
	}

	// Close the SSE connection (no-op if already closed).
	hub.H.CloseClient(roomID, userID, false)
	// Also delete directly from DB in case the SSE connection is already gone
	// and the defer cleanup won't run.
	db.DB.Where("room_id = ? AND user_id = ? AND bot_id = ''", roomID, userID).Delete(&models.RoomMember{})
	// Use DB human-count instead of hub clients — bots may still hold SSE connections
	// and would keep HasClients true even when no humans remain.
	var remainingHumans int64
	db.DB.Model(&models.RoomMember{}).Where("room_id = ? AND bot_id = ''", roomID).Count(&remainingHumans)
	if remainingHumans == 0 {
		hub.H.BroadcastRoomClosed(roomID)
		db.DB.Where("room_id = ?", roomID).Delete(&models.RoomMember{})
		db.DB.Delete(&models.Room{}, "id = ?", roomID)
	} else {
		var currentRoom models.Room
		db.DB.First(&currentRoom, "id = ?", roomID)
		if currentRoom.HostID == userID {
			transferHostToNext(roomID)
		}
		broadcastRoomUpdate(roomID)
	}
	return c.JSON(fiber.Map{"ok": true})
}

// SendChat POST /api/rooms/:id/chat
func SendChat(c *fiber.Ctx) error {
	userID, err := getUserIDFromToken(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}
	roomID := c.Params("id")

	var member models.RoomMember
	if err := db.DB.Where("room_id = ? AND user_id = ? AND bot_id = ''", roomID, userID).First(&member).Error; err != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "not in room"})
	}

	var body struct {
		Message string `json:"message"`
	}
	if err := c.BodyParser(&body); err != nil || body.Message == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid body"})
	}

	var user models.User
	db.DB.First(&user, "id = ?", userID)

	hub.H.BroadcastJSON(roomID, map[string]any{
		"type":      "chat",
		"userId":    userID,
		"username":  user.Username,
		"avatarUrl": user.AvatarURL,
		"message":   body.Message,
	})
	return c.JSON(fiber.Map{"ok": true})
}

// InviteRuleBot POST /api/rooms/:id/invite-rulebot
func InviteRuleBot(c *fiber.Ctx) error {
	userID, err := getUserIDFromToken(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}
	roomID := c.Params("id")

	// Check if user has permission (host or canInviteBots)
	var member models.RoomMember
	if err := db.DB.Where("room_id = ? AND user_id = ? AND bot_id = ''", roomID, userID).First(&member).Error; err != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "not a member"})
	}
	var room models.Room
	db.DB.First(&room, "id = ?", roomID)
	if room.HostID != userID && !member.CanInviteBots {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "no permission"})
	}

	// Check room capacity
	if room.PlayerCount >= room.MaxPlayers {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "room is full"})
	}

	// Count existing rule bots for naming
	var ruleBotCount int64
	db.DB.Model(&models.RoomMember{}).
		Where("room_id = ? AND bot_id LIKE 'rulebot_%'", roomID).
		Count(&ruleBotCount)

	botID := fmt.Sprintf("rulebot_%s", uuid.New().String())
	botName := fmt.Sprintf("Bot %d", ruleBotCount+1)

	botMember := models.RoomMember{
		RoomID:      roomID,
		UserID:      userID,
		BotID:       botID,
		RuleBotName: botName,
		JoinedAt:    time.Now(),
	}
	if err := db.DB.Create(&botMember).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	// 룰봇은 hub 등록 불필요 (SSE 연결 없음)
	broadcastRoomUpdate(roomID)

	return c.JSON(fiber.Map{"ok": true, "botId": botID, "botName": botName})
}

// InviteLLMPlayer POST /api/rooms/:id/invite-llm
func InviteLLMPlayer(c *fiber.Ctx) error {
	userID, err := getUserIDFromToken(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}
	roomID := c.Params("id")

	var body struct {
		LLMBotID string `json:"llmBotId"`
	}
	if err := c.BodyParser(&body); err != nil || body.LLMBotID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "llmBotId is required"})
	}

	// 유저 LLM Bot 유효성 확인
	var llmBot models.LLMBot
	if err := db.DB.First(&llmBot, "id = ? AND user_id = ?", body.LLMBotID, userID).Error; err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "LLM bot not found"})
	}

	// 제공 모델 유효성 확인
	var pm models.ProvidedModel
	if err := db.DB.First(&pm, "id = ? AND is_active = true", llmBot.ProvidedModelID).Error; err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid or inactive model"})
	}

	// 멤버 권한 확인
	var member models.RoomMember
	if err := db.DB.Where("room_id = ? AND user_id = ? AND bot_id = ''", roomID, userID).First(&member).Error; err != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "not a member"})
	}
	var room models.Room
	db.DB.First(&room, "id = ?", roomID)
	if room.HostID != userID && !member.CanInviteBots {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "no permission"})
	}

	// 방 정원 확인
	if room.PlayerCount >= room.MaxPlayers {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "room is full"})
	}

	botID := fmt.Sprintf("llm_%s", uuid.New().String())

	llmMember := models.RoomMember{
		RoomID:          roomID,
		UserID:          userID,
		BotID:           botID,
		ProvidedModelID: pm.ID,
		LLMBotID:        llmBot.ID,
		JoinedAt:        time.Now(),
	}
	if err := db.DB.Create(&llmMember).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	broadcastRoomUpdate(roomID)

	return c.JSON(fiber.Map{"ok": true, "botId": botID, "botName": llmBot.Name, "creditCost": pm.CreditCost})
}

// KickLLMPlayer DELETE /api/rooms/:id/kick-llm/:memberId
func KickLLMPlayer(c *fiber.Ctx) error {
	userID, err := getUserIDFromToken(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}
	roomID := c.Params("id")
	memberID := c.Params("memberId")

	var room models.Room
	if err := db.DB.First(&room, "id = ?", roomID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "room not found"})
	}
	if room.HostID != userID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "host only"})
	}
	if room.Status != "waiting" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "cannot kick during game"})
	}

	result := db.DB.Where("id = ? AND room_id = ? AND provided_model_id != ''", memberID, roomID).Delete(&models.RoomMember{})
	if result.RowsAffected == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "llm player not found"})
	}

	broadcastRoomUpdate(roomID)
	return c.JSON(fiber.Map{"ok": true})
}
