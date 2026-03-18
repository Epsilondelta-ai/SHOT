package ws

import (
	"encoding/json"
	"sync"
)

type SessionHub struct {
	mu    sync.RWMutex
	users map[string]chan []byte // userID → channel
}

var SH = &SessionHub{users: make(map[string]chan []byte)}

func (h *SessionHub) Register(userID string, ch chan []byte) {
	h.mu.Lock()
	if old, ok := h.users[userID]; ok {
		data, _ := json.Marshal(map[string]string{"type": "session_replaced"})
		select {
		case old <- data:
		default:
		}
		close(old)
	}
	h.users[userID] = ch
	h.mu.Unlock()
}

func (h *SessionHub) Unregister(userID string, ch chan []byte) {
	h.mu.Lock()
	if h.users[userID] == ch {
		delete(h.users, userID)
	}
	h.mu.Unlock()
}
