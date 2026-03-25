package hub

import (
	"context"
	"encoding/json"
	"log"
	"runtime"
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
			// Redis 끊김 → 재연결 전 모든 클라이언트에 resync 필요 표시
			h.setAllNeedsResync()
			log.Println("[hub] Redis pub/sub channel closed, reconnecting in 1s...")
			time.Sleep(time.Second)
		}
	}()
}

// setAllNeedsResync 는 모든 로컬 클라이언트의 NeedsResync 플래그를 설정한다.
// Redis Pub/Sub 재연결 시 메시지 유실 구간에 대한 보상 메커니즘.
func (h *Hub) setAllNeedsResync() {
	h.mu.RLock()
	for _, clients := range h.rooms {
		for c := range clients {
			atomic.StoreInt32(&c.NeedsResync, 1)
		}
	}
	h.mu.RUnlock()

	h.botsMu.RLock()
	for _, c := range h.bots {
		atomic.StoreInt32(&c.NeedsResync, 1)
	}
	h.botsMu.RUnlock()
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

	clients := h.rooms[roomID]
	if len(clients) == 0 {
		// 디버그: rooms 맵에 어떤 키가 있는지 확인
		keys := make([]string, 0, len(h.rooms))
		for k := range h.rooms {
			keys = append(keys, k)
		}
		log.Printf("[hub] sendToLocalClients: no clients in room %s (known rooms: %v)", roomID, keys)
		return
	}

	for c := range clients {
		select {
		case c.Ch <- data:
		default:
			log.Printf("[hub] warn: dropped message for user %s in room %s (channel full, len=%d)", c.UserID, roomID, len(c.Ch))
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
		log.Printf("[hub] controlLocalClient: removing client user=%s room=%s event=%s", target.UserID, roomID, ctrl.EventType)
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
	log.Printf("[hub] Register: added client user=%s room=%s (total=%d)", c.UserID, c.RoomID, len(h.rooms[c.RoomID]))
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
		log.Printf("[hub] RegisterAndReplace: removed old client user=%s room=%s", old.UserID, c.RoomID)
	}
	h.rooms[c.RoomID][c] = true
	log.Printf("[hub] RegisterAndReplace: added client user=%s room=%s (total=%d)", c.UserID, c.RoomID, len(h.rooms[c.RoomID]))
	h.mu.Unlock()

	if old != nil {
		old.Replaced = true
		func() {
			defer func() { recover() }()
			data, _ := json.Marshal(Message{Type: "duplicate"})
			select {
			case old.Ch <- data:
			default:
			}
			close(old.Ch)
		}()
	}
	return old != nil
}

func (h *Hub) Unregister(c *Client) {
	h.mu.Lock()
	log.Printf("[hub] Unregister: removing client user=%s room=%s replaced=%v", c.UserID, c.RoomID, c.Replaced)
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
	// 호출 스택 추적
	_, file, line, _ := runtime.Caller(1)
	log.Printf("[hub] BroadcastJSON room=%s caller=%s:%d data=%s", roomID, file, line, string(data[:min(len(data), 80)]))
	h.rdb.Publish(ctx, "room:msg:"+roomID, data)
}

// BroadcastJSONLocal sends to local SSE clients directly (bypassing Redis pub/sub).
// Use this from background goroutines where Redis pub/sub delivery may be unreliable.
func (h *Hub) BroadcastJSONLocal(roomID string, v any) {
	data, _ := json.Marshal(v)
	h.sendToLocalClients(roomID, data)
}

// BroadcastJSONToAll sends to ALL local SSE clients regardless of room.
// Used for rulebot events where the room mapping is unreliable.
func (h *Hub) BroadcastJSONToAll(roomID string, v any) {
	data, _ := json.Marshal(v)
	h.mu.RLock()
	defer h.mu.RUnlock()
	// Try exact room first
	if clients := h.rooms[roomID]; len(clients) > 0 {
		for c := range clients {
			select {
			case c.Ch <- data:
			default:
				atomic.StoreInt32(&c.NeedsResync, 1)
			}
		}
		return
	}
	// Fallback: send to ALL rooms (rulebot games have unreliable room mapping)
	for _, clients := range h.rooms {
		for c := range clients {
			select {
			case c.Ch <- data:
			default:
				atomic.StoreInt32(&c.NeedsResync, 1)
			}
		}
	}
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

// SwapRoom 은 클라이언트를 기존 room에서 제거하고 새 room에 등록하는 것을
// 단일 Lock 내에서 atomic하게 수행한다. room 이동 중 이벤트 유실 방지.
func (h *Hub) SwapRoom(client *Client, newRoomID string) {
	h.mu.Lock()
	log.Printf("[hub] SwapRoom: user=%s from=%s to=%s", client.UserID, client.RoomID, newRoomID)
	// 기존 room에서 제거
	if client.RoomID != "" && client.RoomID != newRoomID {
		delete(h.rooms[client.RoomID], client)
		if len(h.rooms[client.RoomID]) == 0 {
			delete(h.rooms, client.RoomID)
		}
	}
	// 새 room에 등록
	client.RoomID = newRoomID
	if h.rooms[newRoomID] == nil {
		h.rooms[newRoomID] = make(map[*Client]bool)
	}
	h.rooms[newRoomID][client] = true
	h.mu.Unlock()
}

// RegisterBotToRoom 은 봇 초대 시 HTTP 핸들러에서 직접 호출하여
// 봇 클라이언트를 room hub에 동기적으로 등록한다.
// SSE 이벤트 처리를 기다리지 않으므로 초대 직후 게임 시작해도 이벤트 수신 가능.
func (h *Hub) RegisterBotToRoom(botID, roomID string) {
	h.botsMu.RLock()
	c := h.bots[botID]
	h.botsMu.RUnlock()
	if c == nil {
		return
	}
	h.SwapRoom(c, roomID)
}

// DisconnectBot forcibly disconnects a bot's SSE connection.
// Used when API key is regenerated to invalidate the old connection.
func (h *Hub) DisconnectBot(botID string) {
	h.botsMu.Lock()
	c := h.bots[botID]
	delete(h.bots, botID)
	h.botsMu.Unlock()
	if c != nil {
		if c.RoomID != "" {
			h.Unregister(c)
		}
		func() {
			defer func() { recover() }()
			close(c.Ch)
		}()
	}
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
