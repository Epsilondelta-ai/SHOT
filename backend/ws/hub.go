package ws

import (
	"encoding/json"
	"sync"

	fws "github.com/gofiber/contrib/websocket"
)

type Client struct {
	Conn      *fws.Conn
	UserID    string
	Username  string
	AvatarURL string
	RoomID    string
}

type Message struct {
	Type      string `json:"type"`
	UserID    string `json:"userId,omitempty"`
	Username  string `json:"username,omitempty"`
	AvatarURL string `json:"avatarUrl,omitempty"`
	Message   string `json:"message,omitempty"`
}

type Hub struct {
	mu    sync.RWMutex
	rooms map[string]map[*Client]bool
}

var H = &Hub{rooms: make(map[string]map[*Client]bool)}

func (h *Hub) Register(c *Client) {
	h.mu.Lock()
	if h.rooms[c.RoomID] == nil {
		h.rooms[c.RoomID] = make(map[*Client]bool)
	}
	h.rooms[c.RoomID][c] = true
	h.mu.Unlock()

	h.Broadcast(c.RoomID, Message{
		Type:     "join",
		UserID:   c.UserID,
		Username: c.Username,
	})
}

func (h *Hub) Unregister(c *Client) bool {
	h.mu.Lock()
	delete(h.rooms[c.RoomID], c)
	empty := len(h.rooms[c.RoomID]) == 0
	if empty {
		delete(h.rooms, c.RoomID)
	}
	h.mu.Unlock()

	if !empty {
		h.Broadcast(c.RoomID, Message{
			Type:     "leave",
			UserID:   c.UserID,
			Username: c.Username,
		})
	}
	return empty
}

func (h *Hub) Broadcast(roomID string, msg Message) {
	data, _ := json.Marshal(msg)
	h.mu.RLock()
	defer h.mu.RUnlock()
	for c := range h.rooms[roomID] {
		c.Conn.WriteMessage(1, data)
	}
}

func (h *Hub) BroadcastRoomClosed(roomID string) {
	data, _ := json.Marshal(Message{Type: "room_closed"})
	h.mu.RLock()
	clients := make([]*Client, 0, len(h.rooms[roomID]))
	for c := range h.rooms[roomID] {
		clients = append(clients, c)
	}
	h.mu.RUnlock()
	for _, c := range clients {
		c.Conn.WriteMessage(1, data)
	}
}
