package handlers

import (
	"encoding/json"
	"log"

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

// RoomWS GET /api/rooms/:id/ws
func RoomWS(c *fws.Conn) {
	roomID := c.Params("id")
	tokenStr := c.Query("token")

	userID, err := parseUserIDFromToken(tokenStr)
	if err != nil {
		c.Close()
		return
	}

	// Load user info
	var user models.User
	if result := db.DB.First(&user, "id = ?", userID); result.Error != nil {
		c.Close()
		return
	}

	// Verify room exists
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
	defer func() {
		empty := ws.H.Unregister(client)
		if empty {
			// Broadcast room_closed before deleting
			ws.H.BroadcastRoomClosed(roomID)
			// Remove all members and delete the room
			db.DB.Where("room_id = ?", roomID).Delete(&models.RoomMember{})
			db.DB.Delete(&models.Room{}, "id = ?", roomID)
		} else {
			// Update player count
			db.DB.Model(&models.Room{}).Where("id = ?", roomID).UpdateColumn("player_count", db.DB.Model(&models.RoomMember{}).Where("room_id = ?", roomID).Select("count(*)"))
			db.DB.Where("room_id = ? AND user_id = ?", roomID, userID).Delete(&models.RoomMember{})
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
