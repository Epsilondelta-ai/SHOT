// @bun
// src/index.ts
var BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3001";
var CONNECTOR_NAME = process.env.CONNECTOR_NAME ?? "OpenClaw Connector";
var CONNECTOR_VERSION = process.env.CONNECTOR_VERSION ?? "0.0.1";
var CONNECTOR_ID = process.env.CONNECTOR_ID ?? crypto.randomUUID();
var DEVICE_ID = process.env.DEVICE_ID ?? Bun.env.HOSTNAME ?? "local-device";
var PAIRING_CODE = process.env.PAIRING_CODE ?? "";
var MOCK_OPENCLAW = process.env.MOCK_OPENCLAW === "1";
var OPENCLAW_AGENT_ID = process.env.OPENCLAW_AGENT_ID ?? "";
var STATE_PATH = process.env.CONNECTOR_STATE_PATH ?? `${process.cwd()}/.openclaw-bot-connector.json`;
function deriveWsUrl(state) {
  const base = new URL(BACKEND_URL);
  base.protocol = base.protocol === "https:" ? "wss:" : "ws:";
  base.pathname = "/ws/bot-connector";
  base.search = new URLSearchParams({
    botId: state.botId,
    token: state.connectorToken,
    connectorId: state.connectorId,
    connectorName: CONNECTOR_NAME,
    connectorVersion: CONNECTOR_VERSION,
    deviceId: DEVICE_ID
  }).toString();
  return base.toString();
}
async function readState() {
  const file = Bun.file(STATE_PATH);
  if (!await file.exists())
    return null;
  try {
    return JSON.parse(await file.text());
  } catch {
    return null;
  }
}
async function writeState(state) {
  await Bun.write(STATE_PATH, JSON.stringify(state, null, 2));
}
async function redeemPairingCode(pairingCode) {
  const response = await fetch(`${BACKEND_URL}/api/bots/pair/redeem`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      pairingCode,
      connectorId: CONNECTOR_ID,
      connectorName: CONNECTOR_NAME,
      connectorVersion: CONNECTOR_VERSION,
      deviceId: DEVICE_ID
    })
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to redeem pairing code: ${response.status} ${text}`);
  }
  const data = await response.json();
  const state = {
    botId: data.botId,
    connectorId: data.connectorId,
    connectorToken: data.connectorToken
  };
  await writeState(state);
  return state;
}
function buildPrompt(payload) {
  const me = payload.snapshot.players.find((player) => player.id === payload.snapshot.myPlayerId);
  const players = payload.snapshot.players.map((player) => `- ${player.name}: hp=${player.hp}/${player.maxHp}, alive=${player.alive}, jailed=${player.isJailed}, role=${player.role}, verified=${player.verified}`).join(`
`);
  const logs = payload.snapshot.logs.slice(-10).map((entry) => `- [${entry.type}] ${entry.text}`).join(`
`);
  const chats = payload.snapshot.chatMessages.slice(-10).map((entry) => `- ${entry.playerName}: ${entry.text}`).join(`
`);
  return [
    "You are playing a live SHOT turn through an OpenClaw connector.",
    payload.language ? `Speak only in ${payload.language}.` : "",
    me ? `Current player: ${me.name}, role=${me.role}, hp=${me.hp}/${me.maxHp}` : "",
    `Round: ${payload.snapshot.round}/${payload.snapshot.maxRound}`,
    `Phase: ${payload.snapshot.phase}`,
    "",
    "Players:",
    players || "(none)",
    "",
    "Recent log:",
    logs || "(none)",
    "",
    "Recent chat:",
    chats || "(none)",
    "",
    "Valid actions:",
    JSON.stringify(payload.validActions, null, 2),
    "",
    "Respond with ONLY a JSON object matching one valid action."
  ].filter(Boolean).join(`
`);
}
function extractJsonAction(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match)
    return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}
function fallbackAction(payload) {
  return payload.validActions.find((action) => action.type === "skip-chat") ?? payload.validActions.find((action) => action.type === "end-turn") ?? payload.validActions[0] ?? null;
}
async function decideWithOpenClaw(payload) {
  if (!OPENCLAW_AGENT_ID)
    return null;
  const prompt = buildPrompt(payload);
  const proc = Bun.spawn({
    cmd: ["openclaw", "agent", "--agent", OPENCLAW_AGENT_ID, "--message", prompt],
    stdout: "pipe",
    stderr: "pipe"
  });
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    console.error("[connector] openclaw agent failed:", stderr || stdout);
    return null;
  }
  return extractJsonAction(stdout);
}
async function decideAction(payload) {
  if (MOCK_OPENCLAW) {
    return fallbackAction(payload);
  }
  const action = await decideWithOpenClaw(payload);
  return action ?? fallbackAction(payload);
}
async function ensureState() {
  const saved = await readState();
  if (saved)
    return saved;
  if (!PAIRING_CODE) {
    throw new Error(`No connector state found at ${STATE_PATH}. Set PAIRING_CODE once to bootstrap pairing.`);
  }
  return redeemPairingCode(PAIRING_CODE);
}
async function run() {
  const state = await ensureState();
  let heartbeatIntervalMs = 1e4;
  while (true) {
    const wsUrl = deriveWsUrl(state);
    console.log(`[connector] connecting: ${wsUrl}`);
    try {
      await new Promise((resolve) => {
        const ws = new WebSocket(wsUrl);
        let heartbeatTimer = null;
        function clearHeartbeat() {
          if (heartbeatTimer)
            clearInterval(heartbeatTimer);
          heartbeatTimer = null;
        }
        ws.onopen = () => {
          console.log("[connector] connected");
          heartbeatTimer = setInterval(() => {
            if (ws.readyState !== WebSocket.OPEN)
              return;
            ws.send(JSON.stringify({
              type: "heartbeat",
              botId: state.botId,
              connectorId: state.connectorId
            }));
          }, heartbeatIntervalMs);
        };
        ws.onmessage = async (event) => {
          const message = JSON.parse(String(event.data));
          if (message.type === "hello_ack") {
            heartbeatIntervalMs = message.heartbeatIntervalMs;
            console.log("[connector] hello acknowledged");
            return;
          }
          if (message.type === "heartbeat_ack") {
            return;
          }
          if (message.type === "error") {
            console.error("[connector] server error:", message.message);
            return;
          }
          if (message.type === "turn_request") {
            const action = await decideAction(message.payload);
            ws.send(JSON.stringify({
              type: "action_result",
              requestId: message.requestId,
              botId: state.botId,
              action
            }));
          }
        };
        ws.onerror = () => {
          console.error("[connector] websocket error");
        };
        ws.onclose = () => {
          clearHeartbeat();
          console.log("[connector] disconnected, retrying in 3s");
          setTimeout(resolve, 3000);
        };
      });
    } catch (error) {
      console.error("[connector] fatal loop error:", error);
      await Bun.sleep(3000);
    }
  }
}
run().catch((error) => {
  console.error("[connector] startup failed:", error);
  process.exit(1);
});
