# SHOT! Official Rulebook

## 1. Game Overview

SHOT! is an online strategy card game where players are divided into the Agent Team and the Spy Team. The Spy's goal is to disguise themselves as an Agent and assassinate the Captain or eliminate all Agents. The Agent Team's goal is to find and eliminate all Spies.

### Players

5 to 8 players

### Roles

- **Captain (1 player):** Leader of the Agent Team. HP 5. Identity is revealed at the start of the game.
- **Agent:** Assists the Captain and finds Spies. HP 3.
- **Spy:** Disguises as an Agent and aims to assassinate the Captain or eliminate all Agents. HP 3. Spies know each other's identities.

### Composition by Player Count

| Total Players | Spies | Agent Team (Captain + Agents) | Note                 |
| ------------- | ----- | ----------------------------- | -------------------- |
| 5             | 1     | 4 (1+3)                       | Disadvantage for Spy |
| 6             | 2     | 4 (1+3)                       |                      |
| 7             | 2     | 5 (1+4)                       |                      |
| 8             | 2~3   | 5~6 (1+4~5)                   |                      |

---

## 2. Victory Conditions

### Agent Team Victory

- Agent Team wins immediately when all Spies are eliminated.

### Spy Team Victory

- Spy Team wins immediately if the Captain is killed.
- Spy Team wins immediately if all Agents (excluding Spies) are killed.
- Spy Team wins by default if the game reaches the maximum number of turns (Players × 3) without a winner.

---

## 3. Cards

### Card Types

| Card    | Effect                                          | Deck Quantity | Holding Limit | Note                                     |
| ------- | ----------------------------------------------- | ------------- | ------------- | ---------------------------------------- |
| Attack  | Deal 1 damage to the target                     | Players × 5   | 6             |                                          |
| Heal    | Restore target's HP by 1 (cannot exceed max HP) | Players × 2   | 2             | Can be used on self or others            |
| Jail    | Seal target's attack for 1 turn                 | Players × 1   | 1             | Cannot be used on Captain, no duplicates |
| Inspect | Verify target's identity                        | Spies × 1     | Unlimited     | Cannot be used on confirmed identities   |

- All held cards are revealed to everyone.
- Cards exceeding the holding limit are automatically discarded.

---

## 4. Game Preparation

1. The system randomly assigns roles. (1 Captain, Spies based on player count, rest are Agents)
2. Spies verify each other's identities.
3. The Captain's identity is revealed to all players.
4. All players draw 2 cards. (Starting hand)
5. The game proceeds clockwise, starting from the Captain.

---

## 5. Turn Progression

### Turn Structure

1. **Draw Phase:** Draw 2 cards.
2. **Action Phase:** Use cards. No limit on usage per turn. Cards are used sequentially one by one, and multiple players can be attacked in a single turn. You can also skip your turn without using any cards. Once per turn, you may send one chat message at any point during the Action Phase.
3. **End Turn:** The turn passes to the next player.

A player in the Jail state cannot use Attack cards, but can use other cards (Heal, Inspect, Jail). The Jail state is lifted at the end of their next turn.

---

## 6. Attack Rules

### Attack Target Restrictions

- Anyone can attack an Agent (regardless of whether their identity is confirmed or unconfirmed).
- Only a revealed Spy can attack the Captain.
- Spies can also attack each other.

### Sequential Processing and Immediate End

Cards are processed sequentially one by one. The effect applies immediately upon using an Attack card, and the game ends immediately if victory conditions are met. For example, if 5 Attack cards are used on the Captain, and the Captain dies on the 3rd card, the remaining 2 are void and the game ends immediately.

---

## 7. Death Handling

### Identity Reveal

When a player dies, their identity (Agent/Spy) is revealed.

### Kill Rewards

- **Agent Team kills a Spy:** Recover 1 HP + Draw 2 cards
- **Spy kills an Agent:** Recover 1 HP + Draw 2 cards
- **Spy kills a Spy:** Recover 1 HP + Draw 2 cards

### Friendly Fire Penalty

If the Agent Team (Captain/Agent) or a hidden Spy kills an Agent, they enter the Jail state. (Cannot attack until the end of their next turn)

---

## 8. Identity System

### Inspect Card

- Used on an Agent to verify their identity.
- If the target is an Agent, their identity is fixed as a "Confirmed Agent".
- If the target is a Spy, their identity is revealed.
- The person who reveals a Spy via Inspect draws 2 cards.
- Cannot be used on someone whose identity is already confirmed. (The Captain is confirmed from the beginning)

### Spy Voluntary Identity Reveal

- A Spy can voluntarily reveal their identity only during their turn.
- Upon revealing identity, they draw 2 cards, which can be used immediately in the same turn.
- After revealing identity, they are allowed to attack the Captain. (Surprise assassination possible)
- Once an identity is revealed, it cannot be hidden again.

---

## 9. Deck Management

- When the deck runs out, the discard pile is shuffled to form a new deck.
- Cards discarded due to holding limit overflow are also added to the discard pile.

---

## 10. Key Summary

| Item                      | Description                                                                                        |
| ------------------------- | -------------------------------------------------------------------------------------------------- |
| Players                   | 5~8                                                                                                |
| HP                        | Captain 5 / Agent 3 / Spy 3                                                                        |
| Initial Hand              | 2 cards                                                                                            |
| Draw per Turn             | 2 cards                                                                                            |
| Card Usage Limit per Turn | None (Unlimited)                                                                                   |
| Card Usage Method         | Sequentially one by one                                                                            |
| Card Visibility           | All held cards are revealed                                                                        |
| Turn Order                | Clockwise from Captain                                                                             |
| Max Turns                 | Players × 3                                                                                        |
| Victory Conditions        | Agent Team: All Spies eliminated / Spy Team: Captain dies, all Agents eliminated, or time runs out |
