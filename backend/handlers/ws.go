package handlers

import (
	"encoding/json"
	"log"
	"time"

	fws "github.com/gofiber/contrib/websocket"
	"github.com/golang-jwt/jwt/v5"

	"github.com/epsilondelta/shot/db"
	"github.com/epsilondelta/shot/models"
	"github.com/epsilondelta/shot/ws"
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
	ws.H.BroadcastJSON(roomID, RoomUpdateMsg{
		Type:       "room_update",
		HostID:     room.HostID,
		Name:       room.Name,
		MaxPlayers: room.MaxPlayers,
		IsPrivate:  room.IsPrivate,
		Members:    buildMemberInfoList(roomID),
	})
}

func transferHostToNext(roomID string) {
	var nextMember models.RoomMember
	result := db.DB.Where("room_id = ? AND bot_id = '' AND is_spectator = false", roomID).Order("joined_at ASC").First(&nextMember)
	if result.Error != nil {
		return
	}
	db.DB.Model(&models.Room{}).Where("id = ?", roomID).Update("host_id", nextMember.UserID)
}

// RoomWS GET /api/rooms/:id/ws
func RoomWS(c *fws.Conn) {
	roomID := c.Params("id")
	tokenStr := c.Query("token")

	userID, err := parseUserIDFromToken(tokenStr)
	if err != nil {
		c.Close()
		return
	}

	var user models.User
	if result := db.DB.First(&user, "id = ?", userID); result.Error != nil {
		c.Close()
		return
	}

	var room models.Room
	if result := db.DB.First(&room, "id = ?", roomID); result.Error != nil {
		c.Close()
		return
	}

	client := &ws.Client{
		Conn:      c,
		UserID:    userID,
		Username:  user.Username,
		AvatarURL: user.AvatarURL,
		RoomID:    roomID,
	}

	ws.H.Register(client)
	ws.H.Broadcast(roomID, ws.Message{Type: "join", UserID: userID, Username: user.Username})
	broadcastRoomUpdate(roomID)

	defer func() {
		empty := ws.H.Unregister(client)
		if empty {
			ws.H.BroadcastRoomClosed(roomID)
			db.DB.Where("room_id = ?", roomID).Delete(&models.RoomMember{})
			db.DB.Delete(&models.Room{}, "id = ?", roomID)
		} else {
			ws.H.Broadcast(roomID, ws.Message{Type: "leave", UserID: userID, Username: user.Username})
			db.DB.Where("room_id = ? AND user_id = ? AND bot_id = ''", roomID, userID).Delete(&models.RoomMember{})
			// Refresh room to check if this user was host
			var currentRoom models.Room
			if err := db.DB.First(&currentRoom, "id = ?", roomID).Error; err == nil && currentRoom.HostID == userID {
				transferHostToNext(roomID)
			}
			broadcastRoomUpdate(roomID)
		}
	}()

	type incomingMsg struct {
		Type    string `json:"type"`
		Message string `json:"message"`
	}

	for {
		_, data, err := c.ReadMessage()
		if err != nil {
			break
		}
		var msg incomingMsg
		if err := json.Unmarshal(data, &msg); err != nil {
			continue
		}
		if msg.Type == "chat" && msg.Message != "" {
			ws.H.Broadcast(roomID, ws.Message{
				Type:      "chat",
				UserID:    userID,
				Username:  user.Username,
				AvatarURL: user.AvatarURL,
				Message:   msg.Message,
			})
		}
	}
	log.Printf("WS disconnected: user=%s room=%s", userID, roomID)
}
