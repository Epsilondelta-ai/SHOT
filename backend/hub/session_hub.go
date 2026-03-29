package hub

import (
	"encoding/json"
	"fmt"
	"log"
	"strings"
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
	go func() {
		for {
			h.runPubSub()
			log.Println("[session_hub] Redis pub/sub channel closed, reconnecting in 1s...")
			time.Sleep(time.Second)
		}
	}()
}

func (h *SessionHub) runPubSub() {
	pubsub := h.rdb.PSubscribe(ctx, "session:replace:*", "matchmaking:events:*")
	defer pubsub.Close()

	for msg := range pubsub.Channel() {
		if strings.HasPrefix(msg.Channel, "session:replace:") {
			// 세션 교체 이벤트 - 자기 자신의 publish는 무시
			if msg.Payload == instanceID {
				continue
			}
			if len(msg.Channel) > 16 {
				userID := msg.Channel[16:] // "session:replace:" = 16 chars
				h.closeLocalSession(userID)
			}
		} else if strings.HasPrefix(msg.Channel, "matchmaking:events:") {
			// 매칭 이벤트 - 해당 유저에게 전달
			if len(msg.Channel) > 19 {
				userID := msg.Channel[19:] // "matchmaking:events:" = 19 chars
				h.SendToUser(userID, []byte(msg.Payload))
			}
		}
	}
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

// SendToUser sends data to a specific user's SSE channel (non-blocking)
func (h *SessionHub) SendToUser(userID string, data []byte) {
	h.mu.RLock()
	ch, ok := h.users[userID]
	h.mu.RUnlock()
	if ok {
		select {
		case ch <- data:
		default:
			// 채널 버퍼 초과 시 드롭
		}
	}
}

// SendMatchmakingEvent publishes a matchmaking event to a user via Redis Pub/Sub
func (h *SessionHub) SendMatchmakingEvent(userID string, event any) {
	data, err := json.Marshal(event)
	if err != nil {
		return
	}
	h.rdb.Publish(ctx, "matchmaking:events:"+userID, string(data))
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
