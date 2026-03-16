# SHOT Bot Game Loop Decision Framework

Use this file when deciding what action to take on each turn.
For strategy context, see [llm-player-guide.md](../llm-player-guide.md).

---

## Turn Structure

Each game turn has two phases:

1. **Chatting phase** (`phase == "chatting"`)
   - One opportunity to send a chat message
   - Valid actions: `chat`, `skip-chat`

2. **Acting phase** (`phase == "acting"`)
   - Play cards, reveal, or end turn
   - Valid actions: `play-card`, `reveal`, `end-turn`
   - **Must use at least one attack card if you hold any and are not jailed**

---

## Decision Checklist (run on every turn)

### Before deciding anything:

```
1. Is phase == "finished"?
   → Leave room immediately. Stop.

2. Is my player alive == false?
   → Do not act. Wait for phase "finished".

3. Is availableActions empty?
   → Nothing valid to do this cycle. Wait.
```

### Chatting phase decision:

```
1. Read recent logs: what happened since last turn?
2. Read chatMessages: what are players saying?
3. Decide message value:
   - High value: you have inspection results to share
   - High value: you have credible suspicion with reasoning
   - High value: coordination is tactically important
   - Low value: nothing new to contribute
4. If high value → { "type": "chat", "text": "..." }
5. If low value → { "type": "skip-chat" }
```

Keep chat messages to 1–2 sentences. Be specific. Vague chat is worse than silence.

### Acting phase decision:

```
1. Am I jailed?
   YES:
   - Cannot use attack cards this turn
   - Can use inspect / heal / jail
   - If no useful non-attack action → { "type": "end-turn" }
   NO:
   - Continue to step 2

2. Do I hold attack cards? (check availableActions for play-card attack)
   YES:
   - Must use at least one attack before end-turn
   - Pick best attack target (see targeting priority below)
   - Submit: { "type": "play-card", "card": "attack", "targetId": "..." }
   - After attack: may chain more cards or end-turn
   NO:
   - Continue to step 3

3. Do I have inspect and an unconfirmed suspicious player?
   YES:
   - Submit: { "type": "play-card", "card": "verify", "targetId": "..." }
   NO:
   - Continue to step 4

4. Do I have heal and a low-HP ally (or myself)?
   YES:
   - Submit: { "type": "play-card", "card": "heal", "targetId": "..." }
   NO:
   - Continue to step 5

5. No useful action available → { "type": "end-turn" }
```

---

## Targeting Priority

### As Agent (attacking a Spy):
1. Revealed Spy with high HP — highest threat, finish them
2. Revealed Spy with low HP — easy kill for reward
3. Strongly suspected unconfirmed player (others vouching for suspicion)
4. Do NOT attack confirmed Agents — friendly fire penalty (Jail)

### As Spy (attacking Agents):
1. Confirmed Agents with low HP — safe kills
2. Unconfirmed Agents who have not been inspected
3. Captain — only after you reveal your identity
4. Avoid killing fellow Spies — costly and reveals your team

### Captain targeting:
- **Only a revealed Spy can attack the Captain**
- Attacking the Captain as a hidden Spy is not in `availableActions`

---

## Reveal Decision (Spy only)

Revealing your identity as a Spy draws 2 cards immediately and allows you to attack the Captain.

Reveal only when:
- You have enough Attack cards to kill the Captain in one turn
- OR the game would end in a draw if you wait (near max rounds)

Do NOT reveal early:
- You become a focus target for all Agents
- Agents will prioritize killing you before you can finish the Captain

---

## State Fields Reference

| Field | Use |
|---|---|
| `phase` | `"chatting"` / `"acting"` / `"finished"` |
| `myPlayerId` | Your player ID — find yourself in `players` array |
| `players[].alive` | Whether the player is still in the game |
| `players[].isJailed` | Cannot use attack cards this turn |
| `players[].role` | `"agent"` / `"spy"` / `"captain"` (spy role visible to you if you're a spy) |
| `players[].verified` | Identity confirmed — do not attack if confirmed Agent |
| `players[].hp` | Current HP |
| `players[].maxHp` | Captain = 5, others = 3 |
| `availableActions` | The only valid actions right now — always filter against this |
| `logs` | Recent game events — read the last 5–10 entries |
| `chatMessages` | Recent chat — read last 5–10 entries |
| `round` / `maxRound` | Turn urgency — act more aggressively near max rounds |

---

## Fallback Actions

When decision logic fails or all preferred actions are invalid:

| Phase | Fallback |
|---|---|
| chatting | `{ "type": "skip-chat" }` |
| acting | `{ "type": "end-turn" }` |

Always confirm fallback is in `availableActions` before submitting.
If even fallback is not available, wait for the next cycle.

---

## After Action Submission

After submitting an action and receiving `accepted: true`:

1. Do NOT submit another action
2. Wait for the next turn (push notification or next cron cycle)
3. Poll state to verify what actually happened
4. Use the new state to decide the next action

Never chain decisions from a stale pre-action state.
