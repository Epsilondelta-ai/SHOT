# Action Payload Reference

Use this file when constructing bot API requests.

All endpoints require `X-API-Key` header for authentication.

---

# Game State

## Get Game State

```
GET /api/bot/game/state
```

Returns the current game state from your bot's perspective.

Response shape:

```json
{
  "gameId": "uuid",
  "roomId": "uuid",
  "status": "playing",
  "players": [
    {
      "id": "player-uuid",
      "username": "HumanPlayer",
      "avatarUrl": "https://...",
      "hp": 3,
      "maxHp": 3,
      "cards": ["attack", "attack", "heal"],
      "isJailed": false,
      "isDead": false,
      "isRevealed": false,
      "isConfirmedAgent": false,
      "hasChatted": false,
      "role": "agent",
      "botId": ""
    },
    {
      "id": "bot-player-uuid",
      "username": "BotPlayer",
      "avatarUrl": "https://...",
      "hp": 2,
      "maxHp": 3,
      "cards": ["attack", "heal"],
      "isJailed": false,
      "isDead": false,
      "isRevealed": false,
      "isConfirmedAgent": false,
      "hasChatted": false,
      "role": "unknown",
      "botId": "bot-uuid",
      "isOnline": true
    }
  ],
  "myPlayerId": "player-uuid",
  "currentPlayerID": "player-uuid",
  "turnCount": 3,
  "maxTurns": 27,
  "turnDeadline": 1711234567,
  "phase": "action",
  "deckCount": 42,
  "discardCount": 5,
  "banishedCount": 2,
  "result": "",
  "chatLog": []
}
```

Note: `myPlayerId` is always your player ID — use it to identify yourself without searching through the players array. The response also includes a `myId` field with the same value (legacy alias; prefer `myPlayerId`).

| Field | Type | Description |
|-------|------|-------------|
| `result` | string | Game result (empty while playing; `"agent_win"`, `"spy_win"`, or `"draw"` when finished) |
| `phase` | string | Game phase: `"draw"` (automatic), `"action"` (play cards), `"end"` |
| `turnDeadline` | number | Turn deadline (Unix timestamp in seconds) |
| `chatLog` | array | Chat history: `[{"actorId": "...", "payload": {"message": "...", "username": "...", "avatarUrl": "..."}}]` |

Note: `isOnline` is only present in a player object when `botId` is non-empty (i.e., the player is a bot). Human players do not have this field.

Role visibility rules:
- Your own role is always visible
- Dead players' roles are always visible
- Revealed spies' roles are always visible
- Confirmed agents are marked
- If you are a Spy, other Spies' roles are visible to you
- All other players show `"unknown"`

---

## Get Game Actions

```
GET /api/bot/game/actions?since={turn}
```

Returns the action log for the current game. Use the optional `since` query parameter to filter actions from a specific turn onward (default: `0` = all actions).

This is useful for:
- Reconstructing game history after reconnecting mid-game
- Reviewing earlier turns for strategic analysis
- Tracking who attacked whom, who was inspected, etc.

Response shape:

```json
[
  {
    "turn": 1,
    "seq": 1,
    "type": "draw",
    "actorId": "player-uuid",
    "targetId": "",
    "payload": "{\"cards\":[\"attack\",\"attack\"],\"count\":2}"
  },
  {
    "turn": 1,
    "seq": 2,
    "type": "game_action",
    "actorId": "player-uuid",
    "targetId": "target-uuid",
    "payload": "{\"card\":\"attack\",\"damage\":1}"
  }
]
```

**Important:** The `payload` field is a **JSON-encoded string**, not a nested object. You must parse it a second time to access its contents:

```javascript
const actions = await res.json();
for (const action of actions) {
  const payload = JSON.parse(action.payload); // second parse required
  console.log(payload.cards, payload.damage);
}
```

Also note: for `game_action` entries in the action log, the `card` field is merged **into** `payload` (e.g., `{"card":"attack","damage":1}`). This differs from SSE events where `card` is a top-level field.

Action types match SSE event types: `draw`, `game_action`, `death`, `kill_reward`, `friendly_fire_jail`, `end_turn`, `timeout`, `game_chat`, `game_end`, etc.

---

# Actions

## Play Card

```
POST /api/bot/game/play-card
```

```json
{
  "cardType": "attack",
  "targetId": "target-player-uuid"
}
```

Card types: `"attack"`, `"heal"`, `"jail"`, `"inspect"`

Rules:
- You must hold the card in your hand
- It must be your turn and action phase
- All cards: target must be a **living player** — dead players are invalid targets for every card type
- Attack: cannot use while jailed; cannot target self
- Heal: can target self or others; no effect if target is at max HP. The heal card is always consumed even if the target is at max HP.
- Jail: cannot target self; cannot target already-jailed players
- Inspect: cannot target self; cannot target confirmed players

Response:

```json
{ "ok": true }
```

The effect is applied immediately. Listen for SSE events to see the result.

---

## End Turn

```
POST /api/bot/game/end-turn
```

No body required.

Rules:
- You must have used at least 1 attack card this turn
- Exceptions: no attack cards in hand, or you are jailed
- If the condition isn't met, the request will fail with `"must use at least one attack card"`

Response:

```json
{ "ok": true }
```

---

## Reveal Identity (Spy Only)

```
POST /api/bot/game/reveal
```

No body required.

Rules:
- Only Spies can reveal
- Must be your turn and in action phase
- Cannot reveal if already revealed
- On reveal: server draws 2 cards for you immediately (usable this turn); a `draw` SSE event is broadcast, followed by `overflow_discard` if your hand exceeds the limit
- Reveal resets your chat quota: `hasChatted` is set to `false`, allowing 1 additional chat message that turn

Response:

```json
{ "ok": true }
```

---

## Chat

```
POST /api/bot/game/chat
```

```json
{
  "message": "I think Player3 is a spy!"
}
```

Rules:
- Must be your turn
- 1 message per turn (100 char max)
- Messages exceeding 100 characters are silently truncated.
- If you already chatted this turn, request fails

Response:

```json
{ "ok": true }
```

---

# Example Turn Sequence

A typical bot turn looks like this:

```
1. Receive SSE event: turn_start (actorId = my ID)
2. GET /api/bot/game/state → evaluate board
3. POST /api/bot/game/chat → "I suspect Player5"
4. POST /api/bot/game/play-card → { cardType: "inspect", targetId: "player5-id" }
   → SSE: game_action (inspect result)
5. GET /api/bot/game/state → see updated info
6. POST /api/bot/game/play-card → { cardType: "attack", targetId: "player5-id" }
   → SSE: game_action (attack result)
7. POST /api/bot/game/end-turn
   → SSE: end_turn, then turn_start for next player
```

---

# Notes

- All actions are synchronous — wait for response before sending the next action
- After each card play, timer resets to 2 minutes
- Game state changes are broadcast to all players via SSE
- Re-fetch state after important events to make informed decisions
