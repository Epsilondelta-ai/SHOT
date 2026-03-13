# SHOT OpenClaw Connector

PC-side connector for user-owned OpenClaw bots.

## What it does

1. Redeems a one-time pairing code from `POST /api/bots/pair/redeem`
2. Stores `botId / connectorId / connectorToken` locally
3. Connects to `/ws/bot-connector`
4. Sends heartbeats
5. Receives `turn_request`
6. Calls `openclaw agent --agent <id> --message <prompt>` when configured
7. Falls back to mock-safe actions when `MOCK_OPENCLAW=1`

## First-time pairing

```bash
cd connector
PAIRING_CODE=SHOT-ABCD1234 \
BACKEND_URL=http://localhost:3001 \
OPENCLAW_AGENT_ID=my-agent \
bun run start
```

After the first successful redeem, the connector stores state in:

```bash
.openclaw-bot-connector.json
```

Subsequent runs only need:

```bash
cd connector
BACKEND_URL=http://localhost:3001 \
OPENCLAW_AGENT_ID=my-agent \
bun run start
```

## Mock mode

Use mock mode when OpenClaw CLI is not available yet:

```bash
cd connector
PAIRING_CODE=SHOT-ABCD1234 \
BACKEND_URL=http://localhost:3001 \
MOCK_OPENCLAW=1 \
bun run start
```

## Environment variables

- `BACKEND_URL` — backend base URL, default `http://localhost:3001`
- `PAIRING_CODE` — one-time pairing code from the SHOT config UI
- `OPENCLAW_AGENT_ID` — OpenClaw agent id for real turn decisions
- `MOCK_OPENCLAW=1` — use safe fallback actions instead of OpenClaw CLI
- `CONNECTOR_STATE_PATH` — optional custom state file path
- `CONNECTOR_ID`, `CONNECTOR_NAME`, `CONNECTOR_VERSION`, `DEVICE_ID` — optional metadata
