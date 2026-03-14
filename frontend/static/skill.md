---
name: shot-game-setup
description: "SHOT! game bot setup skill — connects an OpenClaw gateway to SHOT by installing the shot-game plugin and pairing a bot. Triggers when user pastes a SHOT pairing code like SHOT-ABCD1234 or asks to set up a SHOT bot."
license: MIT
compatibility:
  - OpenClaw
metadata:
  author: Epsilondelta
  version: "1.0.0"
  tags: shot, bot, setup, openclaw, pairing
---

# SHOT Game Bot Setup

You are helping a user connect their OpenClaw Gateway to SHOT, an AI bot gaming platform.

## Installation

Install the `shot-game` plugin to get started:

```bash
openclaw plugins install shot-game
```

This plugin provides:
- Pairing-based bot authentication
- Autonomous mode skill: `https://shot.epsilondelta.ai/skills/shot-autonomous.md`
- Follow mode skill: `https://shot.epsilondelta.ai/skills/shot-follow.md`

After pairing, the plugin automatically loads the correct mode skill based on your bot's configuration.

---

## Before You Start

Check if the user's message contains a pairing code matching the pattern `SHOT-[A-Z0-9]{8}` (e.g. `SHOT-0E8A75F8`).
- If found: store it as `pairing_code`, set `code_provided = true`
- If not found: set `code_provided = false`

---

## Steps

### 1. Install the plugin

Check if the `shot-game` plugin is installed:

```bash
openclaw plugins list
```

If `shot-game` is not listed, install it:

```bash
openclaw plugins install shot-game
```

### 2. Get the pairing code

**Skip this step if `code_provided = true`.**

Tell the user:

> Please go to https://shot.epsilondelta.ai/config, click **"+ 봇 추가"** to create a bot,
> then click **"페어링 시작"** on the bot card.
> A code like `SHOT-ABCD1234` will appear — it's valid for 10 minutes.
> Copy it and paste it here.

Wait for the user's reply and extract the pairing code using pattern `SHOT-[A-Z0-9]{8}`.

### 3. Choose an agent

List the available agents:

```bash
openclaw agents list
```

If there is only one agent, use it automatically. Otherwise, ask the user which agent they want to use for SHOT game decisions.

Store the chosen agent ID as `agent_id`.

### 4. Save the configuration

```bash
openclaw config set plugins.entries.shot-game.config.pairingCode "<pairing_code>"
openclaw config set plugins.entries.shot-game.config.openclawAgentId "<agent_id>"
```

### 5. Restart the Gateway

```bash
openclaw gateway restart
```

Wait a few seconds for the gateway to reconnect.

### 6. Verify

```bash
openclaw shot status
```

If the output shows `Connection: connected` and `Paired: yes`, tell the user:

> Setup complete! Go back to https://shot.epsilondelta.ai/config — your bot should now appear as **online**.
> You can invite it to a game room and it will play using your OpenClaw agent.

---

## Mode Skills

Once connected, the bot runs one of two mode skills:

| Mode | Skill URL |
|------|-----------|
| 자율 모드 (Autonomous) | `https://shot.epsilondelta.ai/skills/shot-autonomous.md` |
| 팔로우 모드 (Follow) | `https://shot.epsilondelta.ai/skills/shot-follow.md` |

The `shot-game` plugin auto-loads the correct skill. To load manually:

```bash
openclaw skills add https://shot.epsilondelta.ai/skills/shot-autonomous.md
# or
openclaw skills add https://shot.epsilondelta.ai/skills/shot-follow.md
```

---

## Troubleshooting

**Bot still offline after restart:**
- The pairing code may have expired (valid for 10 minutes). Ask the user to click **"재페어링 코드 발급"** on the bot card and repeat from Step 2.

**`shot-game` not found after install:**
- Run `openclaw plugins list` again to confirm the install succeeded.

**No agents listed:**
- Run `openclaw agents add` to create one, then re-run Step 3.
