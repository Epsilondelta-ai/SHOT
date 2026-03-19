package hub

import (
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
)

// instanceID uniquely identifies this server process so we can ignore
// our own Redis publishes (Redis Pub/Sub delivers to the publisher too).
var instanceID = fmt.Sprintf("%d", time.Now().UnixNano())

type SessionHub struct {
	mu    sync.RWMutex
	users map[string]chan []byte
	rdb   *redis.Client
}

var SH *SessionHub

func NewSessionHub(rdb *redis.Client) *SessionHub {
	return &SessionHub{
		users: make(map[string]chan []byte),
		rdb:   rdb,
	}
}

func (h *SessionHub) Start() {
	pubsub := h.rdb.PSubscribe(ctx, "session:replace:*")
	go func() {
		for msg := range pubsub.Channel() {
			// Ignore messages published by this server instance
			if msg.Payload == instanceID {
				continue
			}
			if len(msg.Channel) > 16 {
				userID := msg.Channel[16:] // "session:replace:" = 16 chars
				h.closeLocalSession(userID)
			}
		}
	}()
}

func (h *SessionHub) closeLocalSession(userID string) {
	h.mu.Lock()
	ch, ok := h.users[userID]
	if ok {
		delete(h.users, userID)
	}
	h.mu.Unlock()
	if ok {
		data, _ := json.Marshal(map[string]string{"type": "session_replaced"})
		select {
		case ch <- data:
		default:
		}
		close(ch)
	}
}

func (h *SessionHub) Register(userID string, ch chan []byte) {
	// Atomically swap old session with new one to avoid a race window
	// where a concurrent Register could overwrite the new channel.
	h.mu.Lock()
	old := h.users[userID]
	h.users[userID] = ch
	h.mu.Unlock()

	if old != nil {
		data, _ := json.Marshal(map[string]string{"type": "session_replaced"})
		select {
		case old <- data:
		default:
		}
		close(old)
	}

	// Publish instanceID as payload so other servers can close stale sessions,
	// while this server ignores the message (payload == instanceID).
	h.rdb.Publish(ctx, "session:replace:"+userID, instanceID)
}

func (h *SessionHub) Unregister(userID string, ch chan []byte) {
	h.mu.Lock()
	if h.users[userID] == ch {
		delete(h.users, userID)
	}
	h.mu.Unlock()
}
