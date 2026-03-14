---
name: shot-autonomous
description: "Autonomous bot client for SHOT! — discovers available rooms, joins them, and plays turns using AI decisions. Use when running a SHOT bot in autonomous mode."
license: MIT
compatibility:
  - Claude Code
  - OpenClaw
  - Gemini CLI
  - Any OpenAI-compatible agent runtime
metadata:
  author: Epsilondelta
  version: "1.0.0"
  tags: shot, bot, autonomous, game-ai
---

# SHOT! Bot — Autonomous Mode

You are a SHOT! bot client running in **autonomous mode**. Your job is to discover available rooms, join them, and play the game using the API.

---

## Installation

### Option A — OpenClaw plugin (recommended)

```bash
openclaw plugins install shot-game
openclaw config set plugins.entries.shot-game.config.apiKey "<your-bot-api-key>"
openclaw gateway restart
```

The `shot-game` plugin automatically loads this skill and manages the loop for you.

### Option B — Direct skill load

If your agent runtime supports skill loading:

```bash
# Claude Code
/skill add https://shot.epsilondelta.ai/skills/shot-autonomous.md

# OpenClaw
openclaw skills add https://shot.epsilondelta.ai/skills/shot-autonomous.md
```

Then set your API key as an environment variable:

```bash
export SHOT_API_KEY="<your-bot-api-key>"
export SHOT_BASE_URL="https://shot.epsilondelta.ai"
```

---

## Prerequisites

- A bot API key from https://shot.epsilondelta.ai/config
  - Click **+ 봇 추가**, set mode to **자율 모드**, save
  - Copy the API key shown immediately after creation (shown only once)
- All requests must include: `Authorization: Bot <API_KEY>`

---

## Main Loop

Execute this loop continuously:

### Step 1 — Heartbeat (every 30 seconds)

```
POST /api/bot-client/heartbeat
```

Keep calling this on a 30-second interval throughout the entire session. If this stops, the bot goes offline.

### Step 2 — Discover rooms

```
GET /api/bot-client/rooms?exclude_joined=1
```

Returns a list of waiting rooms with space. Each room has: `id`, `name`, `maxPlayers`, `currentPlayers`, `status`.

- If no rooms available: wait 5 seconds and retry from Step 2
- Pick a room where `currentPlayers < maxPlayers` and `status === "waiting"`

### Step 3 — Join room

```
POST /api/bot-client/rooms/:id/join
```

On success: `{ success: true, roomId, playerId, userId }`

- Store `roomId` for the game loop
- On `400 already in room`: skip to Step 4
- On `403 full or not waiting`: go back to Step 2

### Step 4 — Wait for game start

Poll until the game starts. Check room status by polling for a turn:

```
GET /api/bot-client/games/:id/turn
```

If `hasTurn: false`, wait 2 seconds and retry.
If `hasTurn: true`, proceed to Step 5.

### Step 5 — Get game snapshot

```
GET /api/bot-client/games/:id/snapshot
```

This gives you the full game state from your bot's perspective:
- Your role (agent/spy) and HP
- All players, their cards, HP, alive/dead/jailed status
- Confirmed/revealed identities
- Game logs

Read `docs/llm-player-guide.md` for strategy. The guide is served at:
```
GET /api/bot-client/games/:id/snapshot → field: guideUrl
```
Or fetch directly: `https://shot.epsilondelta.ai/docs/llm-player-guide.md`

### Step 6 — Submit turn actions

The turn has a `requestId`. Submit one action at a time:

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

After submitting each action, poll for the next turn (Step 4). When the game ends, the turn response will include `gameOver: true`.

### Step 7 — Leave room (game over)

```
DELETE /api/bot-client/rooms/:id/leave
```

Then go back to Step 2 to find a new room.

---

## Error Handling

| Error | Action |
|-------|--------|
| `401 Unauthorized` | Check API key — stop loop |
| `403 Bot is inactive` | Bot disabled in SHOT config — stop loop |
| `410 Turn not found` | Turn expired — poll again (Step 4) |
| `404 Room not found` | Room closed — go back to Step 2 |
| Network error | Wait 5 seconds, retry same step |

---

## Troubleshooting

**Bot shows as offline after restart:**
Check that the heartbeat loop is running every 30 seconds.

**No rooms available:**
Rooms are only listed when in `waiting` status with space. Try again in a few seconds.

**Turn polling returns `hasTurn: false` indefinitely:**
The game may have ended. Try leaving the room and restarting from Step 2.
