package hub

import (
	"context"
	"encoding/json"
	"log"
	"sync"
	"sync/atomic"
	"time"

	"github.com/redis/go-redis/v9"
)

var ctx = context.Background()

type Client struct {
	Ch          chan []byte
	UserID      string
	Username    string
	AvatarURL   string
	RoomID      string
	Replaced    bool
	NeedsResync int32 // atomic: 1 = messages were dropped, client should resync state
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

	botsMu sync.RWMutex
	bots   map[string]*Client // botID -> client

	rdb *redis.Client
}

var H *Hub

func NewHub(rdb *redis.Client) *Hub {
	return &Hub{
		rooms: make(map[string]map[*Client]bool),
		bots:  make(map[string]*Client),
		rdb:   rdb,
	}
}

func (h *Hub) Start() {
	go func() {
		for {
			h.runPubSub()
			log.Println("[hub] Redis pub/sub channel closed, reconnecting in 1s...")
			time.Sleep(time.Second)
		}
	}()
}

func (h *Hub) runPubSub() {
	pubsub := h.rdb.PSubscribe(ctx, "room:msg:*", "room:ctrl:*", "bot:events:*")
	defer pubsub.Close()
	for msg := range pubsub.Channel() {
		h.routeRedisMessage(msg)
	}
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
	case len(msg.Channel) > 11 && msg.Channel[:11] == "bot:events:":
		botID := msg.Channel[11:]
		h.sendToBotClient(botID, []byte(msg.Payload))
	}
}

func (h *Hub) sendToLocalClients(roomID string, data []byte) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	for c := range h.rooms[roomID] {
		select {
		case c.Ch <- data:
		default:
			log.Printf("[hub] warn: dropped message for user %s in room %s (channel full)", c.UserID, roomID)
			atomic.StoreInt32(&c.NeedsResync, 1)
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
func (h *Hub) RegisterAndReplaceLocal(c *Client) bool {
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
	return old != nil
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

// RegisterBot registers a bot client for receiving personal events via bot:events:{botID}.
// If a previous client exists it is marked as Replaced and returned so the caller can
// first remove it from the room hub (under mu.Lock) before closing its channel.
// Closing the channel BEFORE unregistering from the room hub would create a race where
// sendToLocalClients (holding mu.RLock) sends to an already-closed channel → panic.
func (h *Hub) RegisterBot(botID string, c *Client) *Client {
	h.botsMu.Lock()
	old := h.bots[botID]
	h.bots[botID] = c
	h.botsMu.Unlock()

	if old != nil {
		old.Replaced = true
	}
	return old
}

// UnregisterBot removes a bot client from the personal event registry.
// Only removes the entry if it still points to the given client, preventing
// a reconnecting bot's new registration from being accidentally deleted.
func (h *Hub) UnregisterBot(botID string, c *Client) {
	h.botsMu.Lock()
	if h.bots[botID] == c {
		delete(h.bots, botID)
	}
	h.botsMu.Unlock()
}

func (h *Hub) sendToBotClient(botID string, data []byte) {
	h.botsMu.RLock()
	c := h.bots[botID]
	h.botsMu.RUnlock()
	if c != nil {
		select {
		case c.Ch <- data:
		default:
			log.Printf("[hub] warn: dropped message for bot %s (channel full)", botID)
			atomic.StoreInt32(&c.NeedsResync, 1)
		}
	}
}

// PublishBotEvent publishes an event to a bot's personal channel.
func (h *Hub) PublishBotEvent(botID string, event any) {
	data, _ := json.Marshal(event)
	h.rdb.Publish(ctx, "bot:events:"+botID, data)
}
