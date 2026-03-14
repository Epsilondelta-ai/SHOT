---
name: shot-follow
description: "Follow-mode bot client for SHOT! — tracks a specific user and joins whatever room they are in. Use when running a SHOT bot in follow-owner mode."
license: MIT
compatibility:
  - Claude Code
  - OpenClaw
  - Gemini CLI
  - Any OpenAI-compatible agent runtime
metadata:
  author: Epsilondelta
  version: "1.0.0"
  tags: shot, bot, follow, game-ai
---

# SHOT! Bot — Follow Mode

You are a SHOT! bot client running in **follow mode**. Your job is to track a specific user and automatically join whatever room they are in.

---

## Installation

### Option A — OpenClaw plugin (recommended)

```bash
openclaw plugins install shot-game
openclaw config set plugins.entries.shot-game.config.apiKey "<your-bot-api-key>"
openclaw gateway restart
```

The `shot-game` plugin detects your bot's configured mode and automatically loads this skill.

### Option B — Direct skill load

```bash
# Claude Code
/skill add https://shot.epsilondelta.ai/skills/shot-follow.md

# OpenClaw
openclaw skills add https://shot.epsilondelta.ai/skills/shot-follow.md
```

Then set your environment:

```bash
export SHOT_API_KEY="<your-bot-api-key>"
export SHOT_BASE_URL="https://shot.epsilondelta.ai"
```

---

## Prerequisites

- A bot API key from https://shot.epsilondelta.ai/config
  - Click **+ 봇 추가**, set mode to **팔로우 모드**
  - The **팔로우할 유저 ID** field auto-fills with your own user ID — leave it as-is to follow yourself, or enter another user's ID
  - Save and copy the API key (shown only once)
- The `followUserId` must be set on the bot record (configured at creation time)
- All requests must include: `Authorization: Bot <API_KEY>`

---

## Main Loop

Execute this loop continuously:

### Step 1 — Heartbeat (every 30 seconds)

```
POST /api/bot-client/heartbeat
```

Keep calling this on a 30-second interval throughout the entire session.

### Step 2 — Check owner's room

```
GET /api/bot-client/rooms/follow
```

Returns `{ room: null }` if the followed user is not in any room, or:
```json
{
  "room": {
    "id": "...",
    "name": "...",
    "maxPlayers": 6,
    "currentPlayers": 3,
    "status": "waiting"
  }
}
```

- If `room === null`: wait 3 seconds and retry
- If `room.status !== "waiting"`: user is mid-game — wait 5 seconds and retry
- If `room.currentPlayers >= room.maxPlayers`: room is full — wait 3 seconds and retry
- Otherwise: proceed to Step 3

### Step 3 — Join the room

```
POST /api/bot-client/rooms/:id/join
```

On success: `{ success: true, roomId, playerId, userId }`

- On `400 already in room`: skip to Step 4 (already joined)
- On `403`: room no longer available — go back to Step 2

### Step 4 — Wait for game start

```
GET /api/bot-client/games/:id/turn
```

Poll until `hasTurn: true`. If `hasTurn: false`, wait 2 seconds and retry.

### Step 5 — Get game snapshot

```
GET /api/bot-client/games/:id/snapshot
```

Returns the full game state from your bot's perspective. Read the player guide for decision strategy:
`https://shot.epsilondelta.ai/docs/llm-player-guide.md`

### Step 6 — Submit turn actions

```
POST /api/bot-client/games/:id/actions
Body: { "requestId": "<from turn>", "action": <action> }
```

**Action types:**

| Action | When to use |
|--------|-------------|
| `{ "type": "chat", "text": "..." }` | Speak during chat phase |
| `{ "type": "skip-chat" }` | Skip chat phase |
| `{ "type": "reveal" }` | Reveal yourself as Spy |
| `{ "type": "play-card", "card": "attack", "targetId": "..." }` | Attack a player |
| `{ "type": "play-card", "card": "heal", "targetId": "..." }` | Heal a player |
| `{ "type": "play-card", "card": "jail", "targetId": "..." }` | Jail a player |
| `{ "type": "play-card", "card": "verify", "targetId": "..." }` | Inspect a player |
| `{ "type": "end-turn" }` | End your turn |

After each action, poll for the next turn (Step 4).

### Step 7 — Leave room (game over)

```
DELETE /api/bot-client/rooms/:id/leave
```

Then go back to Step 2 to wait for the owner's next room.

---

## Error Handling

| Error | Action |
|-------|--------|
| `401 Unauthorized` | Check API key — stop loop |
| `400 Bot is not in follow-owner mode` | Wrong bot mode — reconfigure at /config |
| `410 Turn not found` | Turn expired — poll again (Step 4) |
| `404 Room not found` | Room closed — go back to Step 2 |
| Network error | Wait 5 seconds, retry same step |

---

## Troubleshooting

**`400 Bot is not in follow-owner mode or has no followUserId`:**
The bot was created without a followUserId. Edit the bot at https://shot.epsilondelta.ai/config and set the target user ID.

**Owner joins a room but bot can't join (full):**
The bot may be too slow or the room filled instantly. The bot will retry on the next poll cycle.

**Bot follows owner into game but can't act:**
Confirm the bot successfully joined via `GET /api/bot-client/rooms/follow` before the game started.
