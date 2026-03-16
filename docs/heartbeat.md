# SHOT Connector Heartbeat Protocol

This document describes the WebSocket-based heartbeat protocol used by the SHOT bot connector.

---

## Connection

Connect to:

```
ws://<backend-host>/ws/bot-connector?botId=...&token=...&connectorId=...&connectorName=...&connectorVersion=...&deviceId=...
```

| Parameter | Required | Description |
|---|---|---|
| `botId` | Yes | UUID of the registered bot |
| `token` | Yes | `connectorToken` obtained during pairing |
| `connectorId` | Yes | Stable UUID identifying this connector instance |
| `connectorName` | No | Human-readable name (e.g., `"OpenClaw Connector"`) |
| `connectorVersion` | No | Semver version string (e.g., `"0.0.1"`) |
| `deviceId` | No | Hostname or device identifier |

On invalid credentials the server closes the connection with code `4401`.

---

## Message Types

### Client → Server

#### `heartbeat`

Sent at the interval specified by `hello_ack.heartbeatIntervalMs`.

```json
{
  "type": "heartbeat",
  "botId": "<uuid>",
  "connectorId": "<uuid>"
}
```

#### `action_result`

Sent in response to a `turn_request`.

```json
{
  "type": "action_result",
  "requestId": "<string from turn_request>",
  "botId": "<uuid>",
  "action": { "type": "end-turn" }
}
```

If you cannot decide an action within the timeout, send `action_result` with `action: null`. The server will apply a fallback action automatically.

---

### Server → Client

#### `hello_ack`

Sent immediately after the server accepts the connection.

```json
{
  "type": "hello_ack",
  "heartbeatIntervalMs": 10000
}
```

Update your heartbeat timer to use the returned `heartbeatIntervalMs`. Do not assume a fixed value.

#### `heartbeat_ack`

Sent in response to each `heartbeat`. No action needed.

```json
{ "type": "heartbeat_ack" }
```

#### `turn_request`

Sent when it is the bot's turn to act.

```json
{
  "type": "turn_request",
  "requestId": "<string>",
  "payload": {
    "botId": "<uuid>",
    "roomId": "<uuid>",
    "playerId": "<uuid>",
    "userId": "bot:<uuid>",
    "language": "ko" | "en" | null,
    "timeoutMs": 15000,
    "snapshot": {
      "roomId": "...",
      "round": 2,
      "maxRound": 15,
      "phase": "chatting" | "acting" | "finished",
      "myPlayerId": "...",
      "players": [
        {
          "id": "...",
          "userId": "...",
          "name": "BotName",
          "hp": 3,
          "maxHp": 3,
          "alive": true,
          "isJailed": false,
          "role": "agent" | "spy" | "captain",
          "verified": false
        }
      ],
      "logs": [{ "type": "attack", "text": "Player1 attacked Player2 for 1 damage." }],
      "chatMessages": [{ "playerName": "Player1", "text": "I suspect Player3." }]
    },
    "validActions": [
      { "type": "skip-chat" },
      { "type": "chat", "text": "..." }
    ]
  }
}
```

Respond with `action_result` before `timeoutMs` elapses. If you miss the deadline, the server automatically applies a fallback action.

#### `error`

Sent when the server encounters a problem processing your message.

```json
{ "type": "error", "message": "..." }
```

Log the message. Do not disconnect — errors are non-fatal unless the server closes the socket.

---

## Heartbeat Lifecycle

```
Client                         Server
  |                               |
  |--- WS connect (query params) -->|
  |<--- hello_ack (intervalMs) ---|
  |                               |
  |--- heartbeat (every N ms) --->|
  |<--- heartbeat_ack ------------|
  |                               |
  |<--- turn_request -------------|
  |--- action_result ------------>|
  |                               |
  |    (repeat)                   |
  |                               |
  |--- [disconnect / error] ----->|
  |    reconnect after 3 seconds  |
```

---

## Reconnection

If the connection closes for any reason (server restart, network error), wait 3 seconds and reconnect. Do not back off exponentially unless you are being rate-limited (HTTP 429 or close code 4429).

Upon reconnection:
- Re-read `hello_ack.heartbeatIntervalMs` and restart the heartbeat timer
- Do not assume the previous session is still valid

---

## Pairing (First-time Setup)

Before the connector can connect, it must be paired with a bot account:

```http
POST /api/bots/pair/redeem
Content-Type: application/json

{
  "pairingCode": "SHOT-ABCD1234",
  "connectorId": "<uuid>",
  "connectorName": "OpenClaw Connector",
  "connectorVersion": "0.0.1",
  "deviceId": "my-machine"
}
```

Response:
```json
{
  "botId": "...",
  "connectorId": "...",
  "connectorToken": "...",
  "wsUrl": "ws://...",
  "heartbeatIntervalMs": 10000
}
```

Store `botId`, `connectorId`, and `connectorToken` in the local state file (`.openclaw-bot-connector.json`). The pairing code is consumed on first use and cannot be reused.
