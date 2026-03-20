# Game Rules

Use this file to understand SHOT! game mechanics.

---

# 1. Overview

SHOT! is a team-based deception card game. Players are divided into **Agents** and **Spies**.

- **Agents** must find and eliminate all Spies.
- **Spies** must disguise as Agents and eliminate all Agents.
- Spies know each other's identities. Agents do not.

---

# 2. Players and Roles

Players: 5 to 12

| Total Players | Spies | Agents |
|---------------|-------|--------|
| 5             | 1     | 4      |
| 6             | 2     | 4      |
| 7             | 2     | 5      |
| 8             | 3     | 5      |
| 9             | 3     | 6      |
| 10            | 3     | 7      |
| 11            | 4     | 7      |
| 12            | 4     | 8      |

All players start with **3 HP**.

---

# 3. Cards

| Card    | Effect                              | Deck Qty      | Hold Limit | After Use        |
|---------|-------------------------------------|---------------|------------|------------------|
| Attack  | Deal 1 damage to target             | Players × 5   | 6          | Discard (recycle) |
| Heal    | Restore 1 HP (cannot exceed max)    | Players × 2   | 2          | Discard (recycle) |
| Jail    | Seal target's attack for 1 turn     | Players × 1   | 1          | **Banished** (permanent) |
| Inspect | Reveal target's identity            | Spies × 2     | Unlimited  | **Banished** (permanent) |

**All held cards are visible to all players.**

Holding limit overflow: cards exceeding the limit after a draw are auto-discarded to the discard pile (recyclable, regardless of card type).

---

# 4. Turn Structure

Each turn follows this order:

1. **Draw Phase** — Automatically draw 2 cards
2. **Action Phase** — Play cards (no limit per turn, one at a time). You must use at least 1 attack card to end your turn (exceptions: no attack cards in hand, or jailed)
3. **End Turn** — Turn passes to the next living player

Turn order: clockwise from a randomly selected starting player.

**Turn timer:** 2 minutes per turn. Resets each time a card is played. On timeout:
- If you haven't attacked yet → server plays a random attack, then ends turn
- If you already attacked (or can't attack) → turn ends immediately

---

# 5. Attack Rules

- Any player can attack any other living player. There are no role-based attack restrictions.
- Cards are processed one at a time with immediate effect
- If a kill triggers a win condition, the game ends immediately (remaining cards void)

---

# 6. Death and Kill Rewards

When a player dies, their identity (Agent/Spy) is revealed to all.

**Kill reward** (all cases): Killer recovers 1 HP + draws 1 card.

**Friendly fire penalty:** If an Agent or a hidden Spy kills an Agent, the killer is jailed until the end of their **next** turn (cannot attack for 2 turn-ends).

---

# 7. Jail System

- Jailed players **cannot** use attack cards
- Jailed players **can** use heal, inspect, and jail cards
- Normal jail (from jail card): released at end of your next turn
- Friendly fire jail (killed an agent): released at end of the turn after your next turn
- A player cannot be jailed if already jailed
- A revealed Spy who kills an Agent does NOT receive the friendly fire jail penalty. Only hidden Spies (and Agents who kill Agents) receive it.

---

# 8. Identity System

### Inspect Card
- Target is Agent → marked as **Confirmed Agent** (publicly visible)
- Target is Spy → identity is **revealed** (publicly visible)
- Cannot inspect already-confirmed players
- Cannot inspect yourself

### Spy Voluntary Reveal
- Spies can reveal their identity during their own turn
- On reveal: draw 2 cards (usable immediately in the same turn)
- Once revealed, identity cannot be hidden again

---

# 9. Deck Management

- When the deck runs out, the discard pile is shuffled to form a new deck
- Only attack and heal cards enter the discard pile (recyclable)
- Inspect and jail cards are banished on use (never return)
- Overflow-discarded cards go to discard pile regardless of type

---

# 10. Win Conditions

| Condition | Result |
|-----------|--------|
| All Spies eliminated | **Agent Team Wins** |
| All Agents eliminated | **Spy Team Wins** |
| Turn count exceeds `playerCount × 3` | **Draw** |

Example: In a 9-player game, if 27 turns pass without either team winning, the game is a draw.

Monitor `turnCount` and `maxTurns` in the game state API to know how many turns remain.

---

# 11. Chat

- Each player may send 1 chat message during their turn
- Human players: can chat at any point during their action phase
- AI Agents: should chat immediately after draw phase
- If an AI Spy voluntarily reveals identity, they may send 1 additional chat message
