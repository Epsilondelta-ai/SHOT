# SHOT Bot Implementation Gotchas

These are hard-won lessons from real bot failures. Read this before debugging.

---

## 1. `accepted: true` is NOT action success

The most common source of confusion.

```json
{ "accepted": true }
```

This means: the server received and queued your action request.
It does NOT mean: the action was applied to the game state.

**Wrong pattern:**
```js
await submitAction(action);
// assume state changed
const nextAction = decideBasedOnOldState(); // BUG
```

**Correct pattern:**
```js
await submitAction(action);
// on next poll:
const newState = await pollState();
const nextAction = decideBasedOn(newState);
```

---

## 2. Never submit two actions in the same turn

After submitting an action and receiving `accepted: true`:
- Stop immediately
- Do not submit another action
- Wait for your next turn

Submitting twice in one turn will result in the second action being rejected with a 400 error.

---

## 3. Cooldown actions — do not retry immediately

If an action was accepted but did not seem to apply,
do NOT resubmit the same action in the same cycle.

Wrong: submit → no visible change → submit again immediately
Correct: submit → wait for next state poll → decide again

The server may apply the action asynchronously.
Blind retries cause double-actions and wasted turns.

---

## 4. Check dead and finished states before every action

Always guard at the top of your game loop:

```
if winnerTeam != null        → leave, stop
if my player.alive == false  → stop sending actions
```

Sending actions when dead or after the game ends will return 400 or 404 errors.
These are not bugs — your code failed to check state first.

---

## 5. `availableActions` is the ground truth

Do not hard-code action logic independent of `availableActions`.
The server sends exactly which actions are valid for your current state.

If you want to play a card that is not in `availableActions`,
the server will reject it with `400`.

Always filter your decisions against `availableActions` before submitting.

---

## 6. 404 on game state ≠ error to retry indefinitely

`GET /api/bot/games/:roomId/state` returns `404` when:
- The game has not started yet (still in lobby)
- The game ended and state was cleared

In lobby: 404 is normal. Poll again in 30 seconds.
After game end: 404 means you should leave and return to idle.

Do NOT spam-retry 404 in a tight loop.

---

## 7. Invitation accepted → player already added to room

When the user invites a bot via the UI (`POST /api/rooms/:id/invite-bot/:botId`),
the bot player is added to the room immediately — before the bot calls join.

If you then call `POST /api/bot/rooms/:roomId/join`, the server checks for a pending invitation.
If the invitation is already in `pending` state but the player record already exists,
you will receive `400 Bot is already in the room`.

This is not an error — it means you're already joined.
Proceed directly to setting ready.

---

## 8. Always set ready after joining

Joining a room does NOT automatically set the bot as ready.
The game will never start if a bot remains not-ready.

After every join — or after every lobby poll — call:
```http
POST /api/bot/rooms/:roomId/ready
X-API-Key: mr_...
```

This endpoint is idempotent. Calling it multiple times is safe.

---

## 9. Concurrent join race condition

If multiple bots try to join the same room simultaneously,
the capacity check is not atomic.

If you receive `400 Room is full` on join:
- Accept it — the room is genuinely full
- Do not retry for this room
- Continue checking other invitations

---

## 10. Error loop prevention

If you hit the same error 3 or more times in a row on the same room:
- Leave the room
- Log the issue
- Return to idle
- Do not retry the same room in the same session

Silent infinite loops are the hardest class of bot failures to debug.
Always bound your retry count.
