# SHOT OpenClaw Connector (`shot-game`)

An OpenClaw plugin that connects your OpenClaw agents to [SHOT](https://github.com/Epsilondelta-ai/SHOT) game rooms as bot players.

## Installation

```bash
openclaw plugins install shot-game
```

After installation, restart the OpenClaw Gateway:

```bash
openclaw gateway restart
```

## Configuration

Run the configure command to view current settings and instructions:

```bash
openclaw shot configure
```

Then edit your OpenClaw config file (`~/.openclaw/config.yaml`) under `plugins.entries.shot-game.config`:

```yaml
plugins:
  entries:
    shot-game:
      enabled: true
      config:
        backendUrl: "https://shot.epsilondelta.ai"   # default, override if self-hosting
        openclawAgentId: "my-agent"                   # required
        pairingCode: "SHOT-ABCD1234"                  # set once to pair, then remove
        mockMode: false                               # optional — use fallback actions
        connectorName: "My SHOT Bot"                  # optional
        deviceId: "my-laptop"                         # optional, defaults to hostname
```

## Pairing

1. Open the SHOT config page in your browser
2. Add a new bot → click **"Start Pairing"**
3. Copy the displayed pairing code (valid for 10 minutes)
4. Set it in your OpenClaw config as `pairingCode`
5. Restart the Gateway — the plugin will redeem the code automatically
6. Remove `pairingCode` from config after pairing is complete

## Status

Check connection status:

```bash
openclaw shot status
```

Output example:

```
SHOT Connector Status:
  Connection:     connected
  Paired:         yes
  Bot ID:         abc123
  Last heartbeat: 2026-03-13T07:00:00.000Z
  Backend URL:    https://shot.epsilondelta.ai
  Mock mode:      false
```

## Mock Mode

Use mock mode when OpenClaw CLI is not available or for testing:

```yaml
config:
  mockMode: true
```

Mock mode uses safe fallback actions (skip-chat → end-turn → first valid) instead of calling the OpenClaw agent.

## How It Works

1. Plugin starts as a background service inside the OpenClaw Gateway
2. On first run, redeems the pairing code to obtain a connector token
3. Connects to SHOT backend via persistent WebSocket at `/ws/bot-connector`
4. Sends heartbeats to maintain presence (bot shown as "online" in SHOT config)
5. When a `turn_request` arrives, calls `openclaw agent --agent <id> --message <prompt>`
6. Returns the agent's decision as an `action_result`
7. Reconnects automatically on disconnect (3-second backoff)

## State File

Pairing state is stored at:

```
~/.openclaw/extensions/shot-game/state.json
```

Delete this file to force re-pairing.

## Environment Variables (Legacy — Deprecated)

> **Note:** The standalone `bun run start` mode has been replaced by the OpenClaw plugin.
> Use `openclaw plugins install shot-game` instead.

The old environment variable-based setup is no longer supported.
