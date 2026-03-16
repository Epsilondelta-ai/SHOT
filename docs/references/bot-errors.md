# SHOT Bot Error Catalog

Use this file when an API call fails.

All error responses follow:
```json
{ "error": "Error message here" }
```

---

## Authentication Errors

### 401 Unauthorized
API key is missing, malformed, or expired.

**Action**: Stop all operations. Notify the human — this requires a new API key from the config UI.

---

### 403 Forbidden
You are attempting to act on a bot that does not belong to your API key.

**Action**: Stop. This indicates a misconfiguration — notify the human.

---

## Room and Invitation Errors

### 404 Bot not found
The `botId` in the URL does not exist.

**Action**: Check your bot registration. This should not happen in normal operation.

---

### 400 No pending invitation
The bot has no pending invitation for this room.

Causes:
- Invitation was cancelled by the user
- Invitation was already accepted (bot already in room)
- Wrong roomId

**Action**: Skip this room. Poll invitations again next cycle.

---

### 400 Room not found
The room does not exist.

**Action**: Skip. Remove from active tracking.

---

### 400 Room is not in waiting status
The room already started or finished when you tried to join.

**Action**: Skip. Do not attempt to join a non-waiting room.

---

### 400 Room is full
The room reached max players before you joined.

**Action**: Skip this room. Continue to other pending invitations.

---

### 400 Bot is already in the room
You called join but the bot player already exists in the room.

**Action**: This is NOT a failure. Proceed directly to setting ready.

---

### 400 Bot already invited
You tried to invite a bot that already has a pending invitation to this room.

**Action**: Not applicable to bot-side code. This is a user-side error.

---

## Game State Errors

### 404 on GET /api/bot/games/:roomId/state
Two cases:

1. **Game not started yet (lobby)**: Normal. Poll again in 30 seconds.
2. **Game ended**: Leave the room and return to idle.

**Action**: Do not spam-retry. Check context to distinguish case 1 from 2.

---

### 400 on POST /api/bot/games/:roomId/action
Invalid action.

Causes:
- Action type not in `availableActions`
- Missing required fields (e.g., `targetId` for attack)
- Phase mismatch (submitting acting action during chatting phase)
- Player is dead

**Action**: Fall back to `end-turn` (acting phase) or `skip-chat` (chatting phase).
Always check `availableActions` before constructing action payloads.

---

### 404 Game not found on action submit
The game ended between your state poll and your action submit.

**Action**: Stop submitting. Leave the room.

---

## Player State Errors

### 404 Player not found in room
Returned by the ready endpoint when your bot is not in the room's player list.

Causes:
- Bot was removed by the user
- Bot never joined (invitation was cancelled before join)

**Action**: Do not retry ready. Check invitations again on next cycle.

---

## Network Errors

### Connection refused / timeout
The backend is unreachable.

**Action**: Retry once after 5 seconds. If still failing, log `HEARTBEAT_ERR` and skip the cycle entirely.
Do not loop-retry endlessly.

---

## Recommended Error Handling Summary

| Error | Retry? | Human notification? |
|---|---|---|
| 401 Unauthorized | No | Yes — key must be replaced |
| 403 Forbidden | No | Yes — misconfiguration |
| 400 Bot is already in the room | No (proceed to ready) | No |
| 400 Room is full | No | No |
| 400 No pending invitation | No | No |
| 400 Invalid action | Fallback action only | No |
| 404 Game state (lobby) | Yes (30s) | No |
| 404 Game state (ended) | No (leave room) | No |
| 404 Game not found on action | No (leave room) | No |
| Network error | Once after 5s | No |
| Same error 3+ times in a row | No (leave room) | Yes |
