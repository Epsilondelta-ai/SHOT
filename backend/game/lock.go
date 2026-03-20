package game

import "sync"

// GameLockManager provides per-game mutexes to serialize concurrent state operations.
// Without locking, two concurrent requests (e.g. a player action and a timer timeout)
// can both do LoadState → mutate → SaveState, with the second write silently
// overwriting the first — losing HP ticks, card plays, or turn advances.
type GameLockManager struct {
	mu    sync.Mutex
	locks map[string]*gameLock
}

type gameLock struct {
	mu   sync.Mutex
	refs int
}

// GL is the global per-game lock manager, initialized in main.
var GL *GameLockManager

func NewGameLockManager() *GameLockManager {
	return &GameLockManager{
		locks: make(map[string]*gameLock),
	}
}

// Lock acquires the per-game mutex for the given game ID.
// Creates the lock entry if it doesn't exist yet.
func (glm *GameLockManager) Lock(gameID string) {
	glm.mu.Lock()
	gl, ok := glm.locks[gameID]
	if !ok {
		gl = &gameLock{}
		glm.locks[gameID] = gl
	}
	gl.refs++
	glm.mu.Unlock()
	gl.mu.Lock()
}

// Unlock releases the per-game mutex and removes the entry when no waiters remain.
func (glm *GameLockManager) Unlock(gameID string) {
	glm.mu.Lock()
	gl := glm.locks[gameID]
	if gl != nil {
		gl.refs--
		if gl.refs == 0 {
			delete(glm.locks, gameID)
		}
	}
	glm.mu.Unlock()

	if gl != nil {
		gl.mu.Unlock()
	}
}
