package handlers

import (
	"bufio"
	"fmt"
	"time"

	"github.com/epsilondelta/shot/db"
	"github.com/epsilondelta/shot/models"
	"github.com/epsilondelta/shot/ws"
	"github.com/golang-jwt/jwt/v5"
	"github.com/gofiber/fiber/v2"
)


func parseUserIDFromToken(tokenStr string) (string, error) {
	token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (any, error) {
		return getJWTSecret(), nil
	})
	if err != nil || !token.Valid {
		return "", jwt.ErrSignatureInvalid
	}
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return "", jwt.ErrSignatureInvalid
	}
	sub, ok := claims["sub"].(string)
	if !ok {
		return "", jwt.ErrSignatureInvalid
	}
	return sub, nil
}

type MemberInfo struct {
	UserID        string    `json:"userId"`
	BotID         string    `json:"botId,omitempty"`
	Username      string    `json:"username"`
	OwnerUsername string    `json:"ownerUsername,omitempty"`
	AvatarURL     string    `json:"avatarUrl"`
	IsSpectator   bool      `json:"isSpectator"`
	CanInviteBots bool      `json:"canInviteBots"`
	JoinedAt      time.Time `json:"joinedAt"`
}

type RoomUpdateMsg struct {
	Type       string       `json:"type"`
	HostID     string       `json:"hostId"`
	Name       string       `json:"name"`
	MaxPlayers int          `json:"maxPlayers"`
	IsPrivate  bool         `json:"isPrivate"`
	Members    []MemberInfo `json:"members"`
}

func buildMemberInfoList(roomID string) []MemberInfo {
	var members []models.RoomMember
	db.DB.Where("room_id = ?", roomID).Order("joined_at ASC").Find(&members)

	result := make([]MemberInfo, 0, len(members))
	for _, m := range members {
		info := MemberInfo{
			UserID:        m.UserID,
			BotID:         m.BotID,
			IsSpectator:   m.IsSpectator,
			CanInviteBots: m.CanInviteBots,
			JoinedAt:      m.JoinedAt,
		}
		if m.BotID != "" {
			var bot models.Bot
			if err := db.DB.First(&bot, "id = ?", m.BotID).Error; err == nil {
				info.Username = bot.Name
				info.AvatarURL = bot.AvatarURL
			}
			var owner models.User
			if err := db.DB.First(&owner, "id = ?", m.UserID).Error; err == nil {
				info.OwnerUsername = owner.Username
			}
		} else {
			var user models.User
			if err := db.DB.First(&user, "id = ?", m.UserID).Error; err == nil {
				info.Username = user.Username
				info.AvatarURL = user.AvatarURL
			}
		}
		result = append(result, info)
	}
	return result
}

func broadcastRoomUpdate(roomID string) {
	var room models.Room
	if err := db.DB.First(&room, "id = ?", roomID).Error; err != nil {
		return
	}
	msg := RoomUpdateMsg{
		Type:       "room_update",
		HostID:     room.HostID,
		Name:       room.Name,
		MaxPlayers: room.MaxPlayers,
		IsPrivate:  room.IsPrivate,
		Members:    buildMemberInfoList(roomID),
	}
	ws.H.BroadcastJSON(roomID, msg)
}

func transferHostToNext(roomID string) {
	var candidates []models.RoomMember
	db.DB.Where("room_id = ? AND bot_id = '' AND is_spectator = false", roomID).
		Order("joined_at ASC").Limit(1).Find(&candidates)
	if len(candidates) == 0 {
		return
	}
	db.DB.Model(&models.Room{}).Where("id = ?", roomID).Update("host_id", candidates[0].UserID)
}

// RoomSSE GET /api/rooms/:id/sse
func RoomSSE(c *fiber.Ctx) error {
	tokenStr := c.Query("token")
	if tokenStr == "" {
		return c.Status(fiber.StatusUnauthorized).SendString("unauthorized")
	}
	userID, err := parseUserIDFromToken(tokenStr)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).SendString("unauthorized")
	}

	roomID := c.Params("id")
	var room models.Room
	if err := db.DB.First(&room, "id = ?", roomID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).SendString("room not found")
	}

	// Resolve username and avatar
	var user models.User
	db.DB.First(&user, "id = ?", userID)

	client := &ws.Client{
		Ch:        make(chan []byte, 64),
		UserID:    userID,
		Username:  user.Username,
		AvatarURL: user.AvatarURL,
		RoomID:    roomID,
	}
	// Atomically close any existing local connection and register new one.
	// Using local-only replacement avoids a race where the Redis ctrl message
	// arrives after the new client is registered and accidentally closes it.
	ws.H.RegisterAndReplaceLocal(client)

	// Broadcast join
	ws.H.Broadcast(roomID, ws.Message{
		Type:      "join",
		UserID:    userID,
		Username:  user.Username,
		AvatarURL: user.AvatarURL,
	})
	broadcastRoomUpdate(roomID)

	c.Set("Content-Type", "text/event-stream")
	c.Set("Cache-Control", "no-cache")
	c.Set("Connection", "keep-alive")
	c.Set("X-Accel-Buffering", "no")

	c.Context().SetBodyStreamWriter(func(w *bufio.Writer) {
		defer func() {
			ws.H.Unregister(client)
			if client.Replaced {
				// Superseded by a newer connection — skip DB cleanup
				return
			}
			ws.H.Broadcast(roomID, ws.Message{
				Type:     "leave",
				UserID:   userID,
				Username: user.Username,
			})
			db.DB.Where("room_id = ? AND user_id = ? AND bot_id = ''", roomID, userID).Delete(&models.RoomMember{})
			empty := !ws.H.HasClients(roomID)
			if empty {
				ws.H.BroadcastRoomClosed(roomID)
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
		}()

		ticker := time.NewTicker(15 * time.Second)
		defer ticker.Stop()
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
			}
		}
	})

	return nil
}
