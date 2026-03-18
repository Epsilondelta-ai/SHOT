package hub

import (
	"context"
	"encoding/json"
	"sync"

	"github.com/redis/go-redis/v9"
)

var ctx = context.Background()

type Client struct {
	Ch        chan []byte
	UserID    string
	Username  string
	AvatarURL string
	RoomID    string
	Replaced  bool
}

type Message struct {
	Type      string `json:"type"`
	UserID    string `json:"userId,omitempty"`
	Username  string `json:"username,omitempty"`
	AvatarURL string `json:"avatarUrl,omitempty"`
	Message   string `json:"message,omitempty"`
}

type ctrlMsg struct {
	UserID    string `json:"userId"`
	EventType string `json:"eventType"` // "kicked" | "duplicate" | "close"
}

type Hub struct {
	mu    sync.RWMutex
	rooms map[string]map[*Client]bool
	rdb   *redis.Client
}

var H *Hub

func NewHub(rdb *redis.Client) *Hub {
	return &Hub{
		rooms: make(map[string]map[*Client]bool),
		rdb:   rdb,
	}
}

func (h *Hub) Start() {
	pubsub := h.rdb.PSubscribe(ctx, "room:msg:*", "room:ctrl:*")
	go func() {
		for msg := range pubsub.Channel() {
			h.routeRedisMessage(msg)
		}
	}()
}

func (h *Hub) routeRedisMessage(msg *redis.Message) {
	switch {
	case len(msg.Channel) > 9 && msg.Channel[:9] == "room:msg:":
		roomID := msg.Channel[9:]
		h.sendToLocalClients(roomID, []byte(msg.Payload))
	case len(msg.Channel) > 10 && msg.Channel[:10] == "room:ctrl:":
		roomID := msg.Channel[10:]
		var ctrl ctrlMsg
		if err := json.Unmarshal([]byte(msg.Payload), &ctrl); err != nil {
			return
		}
		h.controlLocalClient(roomID, ctrl)
	}
}

func (h *Hub) sendToLocalClients(roomID string, data []byte) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	for c := range h.rooms[roomID] {
		select {
		case c.Ch <- data:
		default:
		}
	}
}

func (h *Hub) controlLocalClient(roomID string, ctrl ctrlMsg) {
	// Use write lock so we remove from map before closing the channel,
	// preventing sendToLocalClients from sending to a closed channel.
	h.mu.Lock()
	var target *Client
	for c := range h.rooms[roomID] {
		if c.UserID == ctrl.UserID {
			target = c
			break
		}
	}
	if target != nil {
		delete(h.rooms[roomID], target)
		if len(h.rooms[roomID]) == 0 {
			delete(h.rooms, roomID)
		}
	}
	h.mu.Unlock()

	if target == nil {
		return
	}
	switch ctrl.EventType {
	case "kicked":
		data, _ := json.Marshal(Message{Type: "kicked"})
		select {
		case target.Ch <- data:
		default:
		}
		close(target.Ch)
	case "duplicate":
		target.Replaced = true
		data, _ := json.Marshal(Message{Type: "duplicate"})
		select {
		case target.Ch <- data:
		default:
		}
		close(target.Ch)
	case "close":
		close(target.Ch)
	}
}

func (h *Hub) Register(c *Client) {
	h.mu.Lock()
	if h.rooms[c.RoomID] == nil {
		h.rooms[c.RoomID] = make(map[*Client]bool)
	}
	h.rooms[c.RoomID][c] = true
	h.mu.Unlock()
}

// RegisterAndReplaceLocal atomically closes any existing local connection for
// the same user+room and registers the new client. This avoids the race where
// a Redis ctrl message for the old connection arrives after the new client is
// registered and accidentally closes it.
func (h *Hub) RegisterAndReplaceLocal(c *Client) {
	h.mu.Lock()
	if h.rooms[c.RoomID] == nil {
		h.rooms[c.RoomID] = make(map[*Client]bool)
	}
	var old *Client
	for existing := range h.rooms[c.RoomID] {
		if existing.UserID == c.UserID {
			old = existing
			break
		}
	}
	if old != nil {
		delete(h.rooms[c.RoomID], old)
	}
	h.rooms[c.RoomID][c] = true
	h.mu.Unlock()

	if old != nil {
		old.Replaced = true
		data, _ := json.Marshal(Message{Type: "duplicate"})
		select {
		case old.Ch <- data:
		default:
		}
		close(old.Ch)
	}
}

func (h *Hub) Unregister(c *Client) {
	h.mu.Lock()
	delete(h.rooms[c.RoomID], c)
	if len(h.rooms[c.RoomID]) == 0 {
		delete(h.rooms, c.RoomID)
	}
	h.mu.Unlock()
}

func (h *Hub) HasClients(roomID string) bool {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.rooms[roomID]) > 0
}

func (h *Hub) Broadcast(roomID string, msg Message) {
	data, _ := json.Marshal(msg)
	h.rdb.Publish(ctx, "room:msg:"+roomID, data)
}

func (h *Hub) BroadcastJSON(roomID string, v any) {
	data, _ := json.Marshal(v)
	h.rdb.Publish(ctx, "room:msg:"+roomID, data)
}

func (h *Hub) BroadcastRoomClosed(roomID string) {
	data, _ := json.Marshal(Message{Type: "room_closed"})
	h.rdb.Publish(ctx, "room:msg:"+roomID, data)
}

func (h *Hub) KickClient(roomID, userID string) {
	payload, _ := json.Marshal(ctrlMsg{UserID: userID, EventType: "kicked"})
	h.rdb.Publish(ctx, "room:ctrl:"+roomID, payload)
}

func (h *Hub) CloseClient(roomID, userID string, replaced bool) {
	eventType := "close"
	if replaced {
		eventType = "duplicate"
	}
	payload, _ := json.Marshal(ctrlMsg{UserID: userID, EventType: eventType})
	h.rdb.Publish(ctx, "room:ctrl:"+roomID, payload)
}
