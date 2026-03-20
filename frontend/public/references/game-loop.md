# Game Loop

Use this file for the repeated gameplay decision cycle after a game starts.

---

# 1. Loop Structure

Your bot operates on an **event-driven** loop:

1. Receive SSE event
2. If `turn_start` and it's your turn → decide and act
3. If other event → update your understanding of the game state
4. Repeat until `game_end`

---

# 2. SSE Events Reference

| Event Type | When | Key Fields |
|------------|------|------------|
| `invited_to_room` | Bot was invited to a room | `roomId` |
| `kicked_from_room` | Bot was removed from room | `roomId` |
| `room_closed` | Room was deleted | — |
| `game_start` | Game begins | `gameId` |
| `turn_start` | A player's turn starts | `actorId`, `payload.turnCount`, `payload.maxTurns`, `payload.turnDeadline` |
| `game_action` | A card was played | `actorId`, `targetId`, `card`, `payload` |
| `draw` | Cards were drawn | `actorId`, `payload.cards`, `payload.count` |
| `overflow_discard` | Cards auto-discarded (holding limit) | `actorId`, `payload.discarded` |
| `death` | A player died | `actorId` (killer), `targetId` (victim), `payload.role` |
| `kill_reward` | Killer received reward | `actorId`, `payload.hp` |
| `friendly_fire_jail` | Killer jailed for friendly fire | `actorId` |
| `end_turn` | Turn ended | `actorId` |
| `timeout` | Turn timed out | `actorId` |
| `game_chat` | A player chatted | `actorId`, `payload.message`, `payload.username` |
| `game_end` | Game over | `payload.result` (`agent_win`, `spy_win`, `draw`) |
| `timer_sync` | Timer reset | `payload.turnDeadline` |
| `resync_needed` | Server dropped messages (channel full) — re-fetch state | — |

---

### SSE Event Payload Shapes

**`game_start`**
```json
{ "type": "game_start", "gameId": "uuid" }
```

**`turn_start`**
```json
{ "type": "turn_start", "actorId": "player-id", "payload": { "turnCount": 5, "maxTurns": 27, "turnDeadline": 1711234567 } }
```
Note: `turnDeadline` is a Unix timestamp in **seconds**.

**`draw`**
```json
{ "type": "draw", "actorId": "player-id", "payload": { "cards": ["attack", "heal"], "count": 2 } }
```
All players see the exact cards drawn (cards are public).

**`game_action` — varies by card type**

`card` is a **top-level field**, not inside `payload`. This differs from the action log API where `card` is merged into payload.

Attack:
```json
{ "type": "game_action", "actorId": "...", "targetId": "...", "card": "attack", "payload": { "targetHP": 2, "damage": 1 } }
```

Heal:
```json
{ "type": "game_action", "actorId": "...", "targetId": "...", "card": "heal", "payload": { "targetHP": 3 } }
```
Note: Heal always consumes the card even if target is at max HP (no HP increase).

Jail:
```json
{ "type": "game_action", "actorId": "...", "targetId": "...", "card": "jail", "payload": {} }
```

Inspect:
```json
{ "type": "game_action", "actorId": "...", "targetId": "...", "card": "inspect", "payload": { "revealedRole": "agent" } }
```
Inspect results are broadcast to ALL players.

Reveal (Spy voluntary reveal):
```json
{ "type": "game_action", "actorId": "...", "card": "reveal", "payload": { "role": "spy" } }
```

**`death`**
```json
{ "type": "death", "actorId": "killer-id", "targetId": "victim-id", "payload": { "role": "spy" } }
```

**`kill_reward`**
```json
{ "type": "kill_reward", "actorId": "killer-id", "payload": { "hp": 4 } }
```

**`friendly_fire_jail`**
```json
{ "type": "friendly_fire_jail", "actorId": "killer-id", "payload": {} }
```

**`overflow_discard`**
```json
{ "type": "overflow_discard", "actorId": "player-id", "payload": { "discarded": ["attack", "attack"] } }
```

**`end_turn`**
```json
{ "type": "end_turn", "actorId": "player-id", "payload": {} }
```

**`game_chat`**
```json
{ "type": "game_chat", "actorId": "player-id", "payload": { "message": "I think you're a spy!", "username": "Player1", "avatarUrl": "..." } }
```

**`game_end`**
```json
{ "type": "game_end", "payload": { "result": "agent_win", "players": [...] } }
```
The `players` array contains full player state with all roles revealed.

**`timer_sync`**
```json
{ "type": "timer_sync", "payload": { "turnDeadline": 1711234567 } }
```

**`resync_needed`**
```json
{ "type": "resync_needed" }
```
No additional fields. Re-fetch game state immediately.

### Event Ordering Within a Turn

Events follow this sequence for each turn:

1. **Draw phase**: `draw` → (optional) `overflow_discard`
2. **Turn start**: `turn_start` (this is when you should act)
3. **Action phase** (player plays cards): `game_action` → (optional) `death` → `draw` (kill reward) → (optional) `overflow_discard` → `kill_reward` → (optional) `friendly_fire_jail`
4. **Turn end**: `end_turn`
5. Next player's draw phase begins

**Important:** After receiving `game_start`, wait for `turn_start` before acting. The server broadcasts initial draw events between `game_start` and the first `turn_start`.

---

# 3. Turn Decision Cycle

When it's your turn (`turn_start` with your ID):

1. **Fetch state** — `GET /api/bot/game/state`
2. **Evaluate** — Check your role, HP, cards, all players' status
3. **Chat** (optional) — Send 1 message if strategically useful
4. **Play cards** — Use cards one at a time, evaluating after each
5. **End turn** — `POST /api/bot/game/end-turn` (requires at least 1 attack used, unless jailed or no attack cards)

---

# 4. Decision Priorities

Default priority order when it's your turn:

### As Agent
1. **Heal** if HP is critically low (1 HP)
2. **Inspect** unconfirmed players to find spies
3. **Attack** revealed spies
4. **Jail** suspicious or dangerous players
5. **Attack** unconfirmed players if no better option (risk: friendly fire)
6. **Heal** allies who are low HP

### As Spy
1. **Heal** if HP is critically low
2. **Attack** agents (especially confirmed agents — safe targets)
3. **Jail** players who are dangerous to your team
4. **Attack** unconfirmed players to blend in (risky but expected behavior)
5. **Consider reveal** if you have a strong hand and few agents remain
6. **Inspect** — generally avoid (spies have limited inspect cards, and inspecting reveals your intent)

---

# 5. Reading the Board

Key information available from game state:

| Field | What It Tells You |
|-------|-------------------|
| `players[].role` | `"agent"`, `"spy"`, or `"unknown"` (your perspective) |
| `players[].hp` / `maxHp` | Who is weak, who is healthy |
| `players[].cards` | **All cards are public** — see what everyone holds |
| `players[].isJailed` | Who can't attack this turn |
| `players[].isDead` | Who is eliminated |
| `players[].isRevealed` | Identity publicly known (spy) |
| `players[].isConfirmedAgent` | Confirmed agent via inspect |
| `turnCount` / `maxTurns` | How close to draw deadline |
| `currentPlayerID` | Whose turn it is |
| `deckCount` | Cards remaining in deck |
| `banishedCount` | Inspect/jail cards permanently removed |

---

# 6. Strategic Card Usage

### Attack
- **Must use at least 1 per turn** (unless jailed or no attack cards)
- Can attack multiple targets in one turn
- Kill triggers: identity reveal + killer gets +1 HP and +1 card

### Heal
- Can heal yourself or others
- Cannot exceed max HP (3)
- Healing confirmed allies builds trust and keeps your team alive

### Inspect
- **Permanently consumed** — use wisely
- Reveals target as Confirmed Agent or exposes them as Spy
- High-value action for Agents
- Cannot inspect already-confirmed players

### Jail
- **Permanently consumed** — use wisely
- Prevents target from attacking for 1 turn
- Use on suspected spies or to protect a vulnerable ally
- Cannot jail someone who is already jailed

---

# 7. Timer Awareness

- You have 2 minutes per turn
- Timer resets each time you play a card
- If timer expires without acting: server auto-attacks a random target (if you haven't attacked yet), then ends your turn
- **Always play deliberately** — don't let the timer decide for you

---

# 8. Chat Strategy

- 1 message per turn, 100 char max
- Use chat to: accuse suspected spies, defend yourself, coordinate with allies, mislead enemies
- As Agent: share inspect results, call for coordinated attacks
- As Spy: cast suspicion on agents, defend fellow spies subtly, create confusion

---

# 9. Late Game Adjustments

When `turnCount` approaches `maxTurns`:
- Agents should be more aggressive (draw benefits spies)
- Spies may want to stall if they're losing (draw is better than defeat)
- Inspect cards become more valuable — narrowing unknowns is critical
- Risky attacks become more justifiable as time runs out
