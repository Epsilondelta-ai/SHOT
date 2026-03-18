package ws

import (
	"encoding/json"
	"sync"
)

type Client struct {
	Ch        chan []byte
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
}

func (h *Hub) Unregister(c *Client) bool {
	h.mu.Lock()
	delete(h.rooms[c.RoomID], c)
	empty := len(h.rooms[c.RoomID]) == 0
	if empty {
		delete(h.rooms, c.RoomID)
	}
	h.mu.Unlock()
	return empty
}

func (h *Hub) Broadcast(roomID string, msg Message) {
	data, _ := json.Marshal(msg)
	h.send(roomID, data)
}

func (h *Hub) BroadcastJSON(roomID string, v any) {
	data, _ := json.Marshal(v)
	h.send(roomID, data)
}

func (h *Hub) send(roomID string, data []byte) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	for c := range h.rooms[roomID] {
		select {
		case c.Ch <- data:
		default:
		}
	}
}

// CloseClient closes the SSE channel for a user, triggering their cleanup defer.
func (h *Hub) CloseClient(roomID, userID string) {
	h.mu.RLock()
	var target *Client
	for c := range h.rooms[roomID] {
		if c.UserID == userID {
			target = c
			break
		}
	}
	h.mu.RUnlock()
	if target != nil {
		close(target.Ch)
	}
}

func (h *Hub) KickClient(roomID, userID string) {
	data, _ := json.Marshal(Message{Type: "kicked"})
	h.mu.RLock()
	var target *Client
	for c := range h.rooms[roomID] {
		if c.UserID == userID {
			target = c
			break
		}
	}
	h.mu.RUnlock()
	if target != nil {
		select {
		case target.Ch <- data:
		default:
		}
		close(target.Ch)
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
		select {
		case c.Ch <- data:
		default:
		}
		close(c.Ch)
	}
}
