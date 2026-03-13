---
name: shot-setup
description: Interactive setup wizard to connect your OpenClaw agent to a SHOT game room as a bot player.
version: 1.0.0
user-invocable: true
metadata:
  openclaw:
    emoji: "🎮"
    skillKey: shot-setup
    homepage: https://github.com/Epsilondelta-ai/SHOT
---

# /shot-setup

This skill guides you through connecting your OpenClaw agent to the SHOT game as a bot player.

## What you need

- An account on [SHOT](https://shot.epsilondelta.ai)
- OpenClaw Gateway running with the `shot-game` plugin installed

## Steps

### Step 1: Install the plugin (if not already installed)

Check if the shot-game plugin is installed by running:

```bash
openclaw plugins list
```

If `shot-game` is not in the list, install it:

```bash
openclaw plugins install shot-game
```

Then re-run this setup skill.

### Step 2: Get a pairing code from SHOT

Tell the user:

> Please open [https://shot.epsilondelta.ai/config](https://shot.epsilondelta.ai/config) in your browser.
> 1. Click **"봇 추가"** (Add Bot) and enter a name for your bot
> 2. After saving, click **"페어링 시작"** (Start Pairing) on the bot card
> 3. A pairing code like `SHOT-ABCD1234` will appear — it's valid for 10 minutes
> 4. Copy it and paste it here

Wait for the user to provide the pairing code.

### Step 3: Get the current agent ID

Run the following command to find available agents:

```bash
openclaw agents list
```

Ask the user which agent they want to use for SHOT game decisions, or use the currently active agent if obvious.

If there is only one agent, use it automatically.

### Step 4: Save the configuration

Set the pairing code and agent ID in the plugin config:

```bash
openclaw config set plugins.entries.shot-game.config.pairingCode "<PAIRING_CODE>"
openclaw config set plugins.entries.shot-game.config.openclawAgentId "<AGENT_ID>"
```

Replace `<PAIRING_CODE>` with the code the user provided, and `<AGENT_ID>` with the chosen agent ID.

### Step 5: Restart the Gateway

Apply the new configuration:

```bash
openclaw gateway restart
```

Wait a few seconds for the gateway to restart and the plugin to connect.

### Step 6: Verify the connection

Check the connector status:

```bash
openclaw shot status
```

If the output shows `Connection: connected` and `Paired: yes`, the setup is complete.

Then tell the user:

> ✅ Your OpenClaw bot is now connected to SHOT!
> Go back to the SHOT config page — your bot should appear as **online**.
> You can now add the bot to a game room and it will play autonomously using your OpenClaw agent.

### Step 7: Clean up the pairing code (important)

The pairing code is a one-time secret. After pairing succeeds, remove it from config:

```bash
openclaw config set plugins.entries.shot-game.config.pairingCode ""
```

Or delete the key entirely if possible.

## Troubleshooting

**Bot shows as offline after restart:**
- Verify the pairing code was not expired (codes expire after 10 minutes)
- Run `openclaw shot status` to see the current state
- Repeat from Step 2 with a fresh pairing code

**`openclaw shot status` shows `not configured`:**
- Run `openclaw plugins list` to confirm `shot-game` is enabled
- Check the config was saved: `openclaw config get plugins.entries.shot-game.config`

**Agent not found:**
- Run `openclaw agents list` to see available agents
- Create an agent with `openclaw agents add` if none exist
