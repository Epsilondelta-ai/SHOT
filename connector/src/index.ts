type GameAction =
	| { type: 'chat'; text: string }
	| { type: 'skip-chat' }
	| { type: 'reveal' }
	| { type: 'play-card'; card: 'attack' | 'heal' | 'jail' | 'verify'; targetId?: string }
	| { type: 'end-turn' };

type BotTurnRequestPayload = {
	botId: string;
	roomId: string;
	playerId: string;
	userId: string;
	language: string | null;
	timeoutMs: number;
	snapshot: {
		roomId: string;
		round: number;
		maxRound: number;
		phase: 'chatting' | 'acting' | 'finished';
		myPlayerId: string | null;
		players: {
			id: string;
			userId: string;
			name: string;
			hp: number;
			maxHp: number;
			alive: boolean;
			isJailed: boolean;
			role: string;
			verified: boolean;
		}[];
		logs: { type: string; text: string }[];
		chatMessages: { playerName: string; text: string }[];
	};
	validActions: GameAction[];
};

type ConnectorState = {
	botId: string;
	connectorId: string;
	connectorToken: string;
};

type RedeemResponse = {
	botId: string;
	connectorId: string;
	connectorToken: string;
	wsUrl: string;
	heartbeatIntervalMs: number;
};

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:3001';
const CONNECTOR_NAME = process.env.CONNECTOR_NAME ?? 'OpenClaw Connector';
const CONNECTOR_VERSION = process.env.CONNECTOR_VERSION ?? '0.0.1';
const CONNECTOR_ID = process.env.CONNECTOR_ID ?? crypto.randomUUID();
const DEVICE_ID = process.env.DEVICE_ID ?? Bun.env.HOSTNAME ?? 'local-device';
const PAIRING_CODE = process.env.PAIRING_CODE ?? '';
const MOCK_OPENCLAW = process.env.MOCK_OPENCLAW === '1';
const OPENCLAW_AGENT_ID = process.env.OPENCLAW_AGENT_ID ?? '';
const STATE_PATH = process.env.CONNECTOR_STATE_PATH ?? `${process.cwd()}/.openclaw-bot-connector.json`;

function deriveWsUrl(state: ConnectorState) {
	const base = new URL(BACKEND_URL);
	base.protocol = base.protocol === 'https:' ? 'wss:' : 'ws:';
	base.pathname = '/ws/bot-connector';
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

async function readState(): Promise<ConnectorState | null> {
	const file = Bun.file(STATE_PATH);
	if (!(await file.exists())) return null;
	try {
		return JSON.parse(await file.text()) as ConnectorState;
	} catch {
		return null;
	}
}

async function writeState(state: ConnectorState) {
	await Bun.write(STATE_PATH, JSON.stringify(state, null, 2));
}

async function redeemPairingCode(pairingCode: string): Promise<ConnectorState> {
	const response = await fetch(`${BACKEND_URL}/api/bots/pair/redeem`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
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

	const data = (await response.json()) as RedeemResponse;
	const state = {
		botId: data.botId,
		connectorId: data.connectorId,
		connectorToken: data.connectorToken
	};
	await writeState(state);
	return state;
}

function buildPrompt(payload: BotTurnRequestPayload) {
	const me = payload.snapshot.players.find((player) => player.id === payload.snapshot.myPlayerId);
	const players = payload.snapshot.players
		.map(
			(player) =>
				`- ${player.name}: hp=${player.hp}/${player.maxHp}, alive=${player.alive}, jailed=${player.isJailed}, role=${player.role}, verified=${player.verified}`
		)
		.join('\n');
	const logs = payload.snapshot.logs.slice(-10).map((entry) => `- [${entry.type}] ${entry.text}`).join('\n');
	const chats = payload.snapshot.chatMessages
		.slice(-10)
		.map((entry) => `- ${entry.playerName}: ${entry.text}`)
		.join('\n');

	return [
		'You are playing a live SHOT turn through an OpenClaw connector.',
		payload.language ? `Speak only in ${payload.language}.` : '',
		me ? `Current player: ${me.name}, role=${me.role}, hp=${me.hp}/${me.maxHp}` : '',
		`Round: ${payload.snapshot.round}/${payload.snapshot.maxRound}`,
		`Phase: ${payload.snapshot.phase}`,
		'',
		'Players:',
		players || '(none)',
		'',
		'Recent log:',
		logs || '(none)',
		'',
		'Recent chat:',
		chats || '(none)',
		'',
		'Valid actions:',
		JSON.stringify(payload.validActions, null, 2),
		'',
		'Respond with ONLY a JSON object matching one valid action.'
	]
		.filter(Boolean)
		.join('\n');
}

function extractJsonAction(text: string): GameAction | null {
	const match = text.match(/\{[\s\S]*\}/);
	if (!match) return null;
	try {
		return JSON.parse(match[0]) as GameAction;
	} catch {
		return null;
	}
}

function fallbackAction(payload: BotTurnRequestPayload): GameAction | null {
	return (
		payload.validActions.find((action) => action.type === 'skip-chat') ??
		payload.validActions.find((action) => action.type === 'end-turn') ??
		payload.validActions[0] ??
		null
	);
}

async function decideWithOpenClaw(payload: BotTurnRequestPayload): Promise<GameAction | null> {
	if (!OPENCLAW_AGENT_ID) return null;

	const prompt = buildPrompt(payload);
	const proc = Bun.spawn({
		cmd: ['openclaw', 'agent', '--agent', OPENCLAW_AGENT_ID, '--message', prompt],
		stdout: 'pipe',
		stderr: 'pipe'
	});

	const stdout = await new Response(proc.stdout).text();
	const stderr = await new Response(proc.stderr).text();
	const exitCode = await proc.exited;

	if (exitCode !== 0) {
		console.error('[connector] openclaw agent failed:', stderr || stdout);
		return null;
	}

	return extractJsonAction(stdout);
}

async function decideAction(payload: BotTurnRequestPayload): Promise<GameAction | null> {
	if (MOCK_OPENCLAW) {
		return fallbackAction(payload);
	}

	const action = await decideWithOpenClaw(payload);
	return action ?? fallbackAction(payload);
}

async function ensureState() {
	const saved = await readState();
	if (saved) return saved;
	if (!PAIRING_CODE) {
		throw new Error(
			`No connector state found at ${STATE_PATH}. Set PAIRING_CODE once to bootstrap pairing.`
		);
	}

	return redeemPairingCode(PAIRING_CODE);
}

async function run() {
	const state = await ensureState();
	let heartbeatIntervalMs = 10_000;

	while (true) {
		const wsUrl = deriveWsUrl(state);
		console.log(`[connector] connecting: ${wsUrl}`);

		try {
			await new Promise<void>((resolve) => {
				const ws = new WebSocket(wsUrl);
				let heartbeatTimer: Timer | null = null;

				function clearHeartbeat() {
					if (heartbeatTimer) clearInterval(heartbeatTimer);
					heartbeatTimer = null;
				}

				ws.onopen = () => {
					console.log('[connector] connected');
					heartbeatTimer = setInterval(() => {
						if (ws.readyState !== WebSocket.OPEN) return;
						ws.send(
							JSON.stringify({
								type: 'heartbeat',
								botId: state.botId,
								connectorId: state.connectorId
							})
						);
					}, heartbeatIntervalMs) as unknown as Timer;
				};

				ws.onmessage = async (event) => {
					const message = JSON.parse(String(event.data)) as
						| { type: 'hello_ack'; heartbeatIntervalMs: number }
						| { type: 'turn_request'; requestId: string; payload: BotTurnRequestPayload }
						| { type: 'error'; message: string }
						| { type: 'heartbeat_ack' };

					if (message.type === 'hello_ack') {
						heartbeatIntervalMs = message.heartbeatIntervalMs;
						console.log('[connector] hello acknowledged');
						return;
					}

					if (message.type === 'heartbeat_ack') {
						return;
					}

					if (message.type === 'error') {
						console.error('[connector] server error:', message.message);
						return;
					}

					if (message.type === 'turn_request') {
						const action = await decideAction(message.payload);
						ws.send(
							JSON.stringify({
								type: 'action_result',
								requestId: message.requestId,
								botId: state.botId,
								action
							})
						);
					}
				};

				ws.onerror = () => {
					console.error('[connector] websocket error');
				};

				ws.onclose = () => {
					clearHeartbeat();
					console.log('[connector] disconnected, retrying in 3s');
					setTimeout(resolve, 3000);
				};
			});
		} catch (error) {
			console.error('[connector] fatal loop error:', error);
			await Bun.sleep(3000);
		}
	}
}

run().catch((error) => {
	console.error('[connector] startup failed:', error);
	process.exit(1);
});
