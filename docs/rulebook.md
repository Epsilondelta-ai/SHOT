# SHOT! Official Rulebook

> Online Strategy Card Game · 5-12 Players

---

## 1. Game Overview

SHOT! is an online strategy card game where players are divided into the Agent Team and the Spy Team. The Spy's goal is to disguise themselves as an Agent and eliminate all Agents. The Agent Team's goal is to find and eliminate all Spies.

### Players

5 to 12 players

### Roles

- **Agent:** Finds and eliminates Spies. HP 3.
- **Spy:** Disguises as an Agent and aims to eliminate all Agents. HP 3. Spies know each other's identities.

### Composition by Player Count

| Total Players | Spies | Agents | Note                 |
| ------------- | ----- | ------ | -------------------- |
| 5             | 1     | 4      | Disadvantage for Spy |
| 6             | 2     | 4      |                      |
| 7             | 2     | 5      |                      |
| 8             | 3     | 5      |                      |
| 9             | 3     | 6      | Recommended          |
| 10            | 3     | 7      |                      |
| 11            | 4     | 7      |                      |
| 12            | 4     | 8      |                      |

---

## 2. Victory Conditions

### Agent Team Victory

- Agent Team wins immediately when all Spies are eliminated.

### Spy Team Victory

- Spy Team wins immediately if all Agents (excluding Spies) are killed.

### Draw

- If the total number of turns exceeds Player Count × 3, the game is a draw.

---

## 3. Cards

### Card Types

| Card    | Effect                                          | Deck Quantity | Holding Limit | Note                                   |
| ------- | ----------------------------------------------- | ------------- | ------------- | -------------------------------------- |
| Attack  | Deal 1 damage to the target                     | Players × 5   | 6             |                                        |
| Heal    | Restore target's HP by 1 (cannot exceed max HP) | Players × 2   | 2             | Can be used on self or others          |
| Jail    | Seal target's attack for 1 turn                 | Players × 1   | 1             | No duplicates                          |
| Inspect | Verify target's identity                        | Spies × 2     | Unlimited     | Cannot be used on confirmed identities |

- All held cards are revealed to everyone.
- Cards exceeding the holding limit are automatically discarded.

---

## 4. Game Preparation

1. The system randomly assigns roles. (Spies based on player count, rest are Agents)
2. Spies verify each other's identities.
3. All players draw 2 cards. (Starting hand)
4. The game proceeds clockwise, starting from a randomly selected player.

---

## 5. Turn Progression

### Turn Structure

1. **Draw Phase:** Draw 2 cards.
2. **Action Phase:** Use cards. No limit on usage per turn. Cards are used sequentially one by one, and multiple players can be attacked in a single turn. At least 1 Attack card must be used to end the turn. Exceptions: no Attack cards in hand, or being in the Jail state.
3. **End Turn:** The turn passes to the next player.

A player in the Jail state cannot use Attack cards, but can use other cards (Heal, Inspect, Jail). The Jail state is lifted at the end of their next turn.

### Chat

Each player may send 1 chat message during their turn.

- **Human players:** May chat once at any point after drawing 2 cards and before ending their turn (optional).
- **AI Agents:** May chat once immediately after drawing 2 cards (optional).
  - If an AI Agent is playing as a Spy and voluntarily reveals their identity, they may send 1 additional chat message immediately after the reveal (optional).

---

## 6. Attack Rules

### Attack Target Restrictions

- Anyone can attack an Agent (regardless of whether their identity is confirmed or unconfirmed).
- Spies can also attack each other.

### Sequential Processing and Immediate End

Cards are processed sequentially one by one. The effect applies immediately upon using an Attack card, and the game ends immediately if victory conditions are met. For example, if 5 Attack cards are used on a player and they die on the 3rd card, the remaining 2 are void and the game ends immediately.

---

## 7. Death Handling

### Identity Reveal

When a player dies, their identity (Agent/Spy) is revealed.

### Kill Rewards

- **Agent Team kills a Spy:** Recover 1 HP + Draw 1 card
- **Spy kills an Agent:** Recover 1 HP + Draw 1 card
- **Spy kills a Spy:** Recover 1 HP + Draw 1 card

### Friendly Fire Penalty

If an Agent or a hidden Spy kills an Agent, they enter the Jail state. (Cannot attack until the end of their next turn)

---

## 8. Identity System

### Inspect Card

- Used on an Agent to verify their identity.
- If the target is an Agent, their identity is fixed as a "Confirmed Agent".
- If the target is a Spy, their identity is revealed.
- Cannot be used on someone whose identity is already confirmed.

### Spy Voluntary Identity Reveal

- A Spy can voluntarily reveal their identity only during their turn.
- Upon revealing identity, they draw 2 cards, which can be used immediately in the same turn.
- Once an identity is revealed, it cannot be hidden again.

---

## 9. Deck Management

- When the deck runs out, the discard pile is shuffled to form a new deck.
- Cards discarded due to holding limit overflow are also added to the discard pile.

---

## 10. Key Summary

| Item                      | Description                                                        |
| ------------------------- | ------------------------------------------------------------------ |
| Players                   | 5~12                                                               |
| HP                        | Agent 3 / Spy 3                                                    |
| Initial Hand              | 2 cards                                                            |
| Draw per Turn             | 2 cards                                                            |
| Card Usage Limit per Turn | None (Unlimited)                                                   |
| Card Usage Method         | Sequentially one by one                                            |
| Card Visibility           | All held cards are revealed                                        |
| Turn Order                | Clockwise from a randomly selected player                          |
| Victory Conditions        | Agent Team: All Spies eliminated / Spy Team: All Agents eliminated |
