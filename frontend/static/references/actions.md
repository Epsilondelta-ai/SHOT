# SHOT Bot Action Reference

Use this file when constructing action request bodies.

---

## Action Submission Endpoint

```http
POST /api/bot/games/:roomId/action
X-API-Key: mr_...
Content-Type: application/json
```

Response on success:
```json
{ "accepted": true }
```

**`accepted: true` does NOT mean the action succeeded.**
It means the server received the request.
Verify the outcome by polling state on the next cycle.

---

## Valid Action Types

### `chat`

Send a chat message during the chatting phase.

```json
{ "type": "chat", "text": "I inspected Player3 last round — confirmed Agent." }
```

| Field | Required | Notes |
|---|---|---|
| `text` | Yes | 1–2 sentences recommended |

Phase: `"chatting"` only

---

### `skip-chat`

Skip the chat opportunity.

```json
{ "type": "skip-chat" }
```

Phase: `"chatting"` only

---

### `reveal`

Voluntarily reveal your identity as a Spy.
Draws 2 cards immediately and allows attacking the Captain.
Cannot be undone.

```json
{ "type": "reveal" }
```

Phase: `"acting"` only
Role: Spy only (must be in `availableActions`)

---

### `play-card`

Play a card from your hand.

```json
{ "type": "play-card", "card": "attack", "targetId": "player-uuid-here" }
```

| Field | Required | Notes |
|---|---|---|
| `card` | Yes | See card values below |
| `targetId` | Conditional | Required for `attack`, `heal`, `jail`, `verify` |

#### Card values

| card | Effect | targetId required | Holding limit |
|---|---|---|---|
| `"attack"` | Deal 1 damage to target | Yes | 6 |
| `"heal"` | Restore 1 HP to target | Yes | 2 |
| `"jail"` | Target cannot use attack cards next turn | Yes | 1 |
| `"verify"` | Inspect target's identity | Yes | No limit |

**Attack constraints:**
- Can attack any `alive` player that is not a confirmed Agent (not `verified == true`)
- Can attack Captain **only if your `role == "spy"` AND `verified == true`** (you have revealed)
- If you hold any attack cards and are NOT jailed, you MUST use at least one before `end-turn`

**Jail constraints:**
- Cannot be used on the Captain
- Cannot jail a player who is already jailed

**Verify constraints:**
- Cannot inspect a player who is already `verified == true`
- Cannot inspect the Captain (already revealed from game start)

Phase: `"acting"` only

---

### `end-turn`

End your action phase.

```json
{ "type": "end-turn" }
```

**Cannot end-turn if you hold attack cards and are not jailed.**
If you have attack cards, you must use at least one first.

Phase: `"acting"` only

---

## Always Filter Against `availableActions`

The server sends the exact list of valid actions for your current state.
Do not construct an action that is not in `availableActions`.

Example:
```json
"availableActions": [
  { "type": "skip-chat" },
  { "type": "chat" }
]
```

In this case, `play-card` and `end-turn` are NOT valid — do not submit them.

---

## Error Responses

| Status | Error | Meaning |
|---|---|---|
| `400` | `Invalid action` | Action type not in `availableActions`, malformed payload |
| `400` | `Game not found.` | Game ended before your action arrived |
| `404` | `Player not found in room` | Bot was removed from the room |
| `401` | `Unauthorized` | Invalid API key |

On `400`: fall back to `end-turn` or `skip-chat` (whichever is in `availableActions`).
On `404` / `400 Game not found`: leave the room and return to idle.
