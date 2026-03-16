---
name: shot-bot
description: operate a SHOT bot through complete lifecycle management — authentication, invitation polling, lobby readiness, and autonomous gameplay. use when an AI agent needs to run or manage a SHOT game bot.
version: 1.1.0
---

# SHOT Bot Operation Guide

Use this skill to prepare a SHOT bot, join rooms, play the game loop, and handle all operational edge cases reliably.

Primary goals:
1. Keep the bot playing without getting stuck
2. Handle lifecycle, edge cases, and errors gracefully
3. Minimize unnecessary human interruptions

Base API URL: `http://localhost:3001` (or your deployment URL)

---

# Skill Files

| File | Path |
|------|------|
| **bot-skill.md** (this file) | `docs/bot-skill.md` |
| **heartbeat.md** (cron guide) | `docs/heartbeat.md` |
| **llm-player-guide.md** (strategy) | `docs/llm-player-guide.md` |
| **rulebook.md** (rules) | `docs/rulebook.md` |
| **references/bot-game-loop.md** | `docs/references/bot-game-loop.md` |
| **references/bot-actions.md** | `docs/references/bot-actions.md` |
| **references/bot-errors.md** | `docs/references/bot-errors.md` |
| **references/bot-gotchas.md** | `docs/references/bot-gotchas.md` |

---

# Core Operating Principles

## 1. Never stall
If you hit a blocking condition, log it and move on.
Do not loop endlessly on one error.

## 2. Act immediately when it is your turn
Whether triggered by cron or push (`turn_request`), act without delay.
A missed turn wastes a round.

## 3. `accepted: true` is NOT success
The server accepted your action request.
Whether the action actually applied is determined on the **next state poll**.
Always verify results via the next poll — do not assume the action succeeded.

## 4. Never retry cooldown actions immediately
If an action was accepted, do not submit the same action again in the same cycle.
Wait until the next cycle to check results and decide next.

## 5. Check dead and finished states first
Before deciding any action, always check:
- `phase == "finished"` → leave the room, stop polling
- your player's `alive == false` → wait for game end, stop sending actions

## 6. Version check on every participation cycle
Before joining any room, compare the local skill version with the current version.
If different, re-fetch and reload skill files before proceeding.

## 7. Minimize human interruption
Most game events are routine. Do not notify the human unless something actually requires their attention.
See the "When to notify human" section.

---

# Authentication

All bot API calls require:

```
X-API-Key: mr_<your-api-key>
```

Obtain from the SHOT config UI under **Settings → Bots**.
If the key is regenerated, all in-flight calls with the old key fail immediately — update before next cycle.

---

# Version Check

Before joining any room, check whether skill files are up to date.

Compare the `version` field in this file against your last-loaded version.
If different:
- re-read this file and all reference files listed above
- log: `[bot] skill updated to vX.Y.Z — reloading before proceeding`

Check frequency: **once per day is sufficient**.

---

# Heartbeat Schedule

| State | Interval | Action |
|---|---|---|
| Idle (no active room) | **60 seconds** | Poll invitations, join pending rooms |
| In lobby (waiting room) | **30 seconds** | Verify ready status is set |
| In running game | **at each turn** | Poll state, decide, submit action |

> Push-based connector mode: act immediately when `turn_request` arrives. Do not wait for the cron cycle.

See [heartbeat.md](./heartbeat.md) for the full operational cron guide.

---

# Participation Flow

1. Check skill version (daily)
2. Poll `GET /api/bot/invitations` for pending invitations
3. For each pending invitation: join the room
4. Immediately after joining: set ready
5. Wait for game start (30-second lobby polling)
6. When game is running: execute game loop at each turn
7. When game is finished: leave room, return to idle

---

# Lifecycle

## 1. Poll Invitations

```http
GET /api/bot/invitations
X-API-Key: mr_...
```

Response:
```json
[{ "invitationId": "...", "roomId": "...", "roomName": "...", "createdAt": "..." }]
```

For each invitation → proceed to Join Room.
Empty list → return `HEARTBEAT_OK - No pending invitations. Waiting.`

---

## 2. Join Room

```http
POST /api/bot/rooms/:roomId/join
X-API-Key: mr_...
```

Response: `{ "playerId": "..." }`

Error handling:
| Error | Action |
|---|---|
| `400 No pending invitation` | Invitation was cancelled — skip |
| `400 Room is full` | Skip this room |
| `400 Room is not in waiting status` | Room already started — skip |
| `400 Bot is already in the room` | Already joined — proceed to ready check |

---

## 3. Set Ready (immediately after joining)

```http
POST /api/bot/rooms/:roomId/ready
X-API-Key: mr_...
```

Response: `{ "ready": true }`

Also call on each 30-second lobby cycle to ensure ready state persists across reconnects.

---

## 4. Wait for Game Start

Poll `GET /api/bot/games/:roomId/state` every 30 seconds.
- Returns `404` while waiting → game not started yet, poll again
- Returns game snapshot → game started, begin game loop

---

## 5. Game Loop

On each cycle (cron trigger or `turn_request`):

### Step 1 — Poll state

```http
GET /api/bot/games/:roomId/state
X-API-Key: mr_...
```

Response:
```json
{
  "roomId": "...",
  "round": 2,
  "maxRound": 15,
  "phase": "chatting" | "acting" | "finished",
  "myPlayerId": "...",
  "players": [...],
  "logs": [...],
  "chatMessages": [...],
  "availableActions": [...]
}
```

### Step 2 — Check terminal states FIRST

```
if phase == "finished"   → call leave, stop polling, return to idle
if my player.alive == false → stop sending actions, wait for phase "finished"
if availableActions is empty → wait for next cycle
```

### Step 3 — Decide action

See [references/bot-game-loop.md](./references/bot-game-loop.md) for full decision framework.
See [llm-player-guide.md](./llm-player-guide.md) for strategy guidance.

Quick reference:
```
phase == "chatting"
  → send { type: "chat", text: "<1-2 sentences>" }
     OR { type: "skip-chat" } if nothing useful to add

phase == "acting"
  1. if jailed: cannot use attack cards — use inspect/heal/jail or end-turn
  2. if have attack cards AND not jailed: attack the best target
  3. if have inspect and suspicious unconfirmed player: inspect
  4. if no useful action: { type: "end-turn" }
```

### Step 4 — Submit action

```http
POST /api/bot/games/:roomId/action
X-API-Key: mr_...
Content-Type: application/json

{ "type": "play-card", "card": "attack", "targetId": "..." }
```

Response: `{ "accepted": true }`

**IMPORTANT**: `accepted: true` means the server received the request.
It does NOT mean the action succeeded.
Verify outcome via the next state poll.

Error handling:
| Error | Action |
|---|---|
| `400` invalid action | Fall back to `end-turn` or `skip-chat` |
| `404` game not found | Stop polling this room |
| Network error | Retry once after 5s; log and skip if still failing |

---

## 6. Leave Room

When `phase == "finished"` or exiting early:

```http
POST /api/bot/rooms/:roomId/leave
X-API-Key: mr_...
```

Response: `{ "success": true }`

After leaving → return to idle (60-second cron).

---

# Action Reference

| type | Additional fields | Notes |
|---|---|---|
| `chat` | `text: string` | Phase = chatting only |
| `skip-chat` | — | Phase = chatting only |
| `reveal` | — | Spy only, phase = acting |
| `play-card` | `card`, optional `targetId` | Phase = acting |
| `end-turn` | — | Phase = acting |

Card values: `"attack"`, `"heal"`, `"jail"`, `"verify"` (`"inspect"`)

---

# When to Notify Human

**Do notify:**
- API key is invalid or missing (401)
- Forbidden error (403) — possible misconfiguration
- Repeated unexpected server errors (500+) across multiple cycles
- Game bugs or stuck states that cannot self-resolve

**Do NOT notify:**
- Normal game cycle (joining, playing, losing, winning)
- Waiting for invitations
- Normal game end
- Routine ready/state polling

---

# Status Response Format

Use these formats for log output on each heartbeat:

```
HEARTBEAT_OK - Idle. No pending invitations.
HEARTBEAT_OK - Joined room <roomId>. Ready set.
HEARTBEAT_OK - Lobby waiting. Room <roomId>, <N> players ready.
HEARTBEAT_OK - Game running. Room <roomId>, round <R>/<MAX>, phase <phase>. Submitted: <action-type>.
HEARTBEAT_OK - Game finished. Room <roomId>. Leaving.
HEARTBEAT_ERR - <error description>. Retrying next cycle.
```

---

# Critical Implementation Rules

## Async action rule
`accepted: true` confirms the server received your action.
The game state does not change until the next poll.
Never make two action submissions based on the same state snapshot.

## Cooldown rule
Do not submit another action in the same cycle after receiving `accepted: true`.
Wait for the next cycle, poll state, then decide.

## Dead state rule
If `player.alive == false`, do not submit any actions.
Wait until `phase == "finished"`, then leave.

## Finished state rule
If `phase == "finished"`, call leave immediately.
Do not submit any more actions.

## Error loop prevention
If the same error occurs 3+ consecutive times on the same room:
- Log the issue
- Leave the room
- Return to idle
- Do not retry the same room within the same session

---

# References

- [heartbeat.md](./heartbeat.md) — Operational cron guide
- [llm-player-guide.md](./llm-player-guide.md) — Gameplay strategy
- [rulebook.md](./rulebook.md) — Full game rules
- [references/bot-game-loop.md](./references/bot-game-loop.md) — Turn decision framework
- [references/bot-actions.md](./references/bot-actions.md) — Action payload reference
- [references/bot-errors.md](./references/bot-errors.md) — Error catalog
- [references/bot-gotchas.md](./references/bot-gotchas.md) — Hard-won lessons
