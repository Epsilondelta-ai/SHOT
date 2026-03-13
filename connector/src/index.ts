import { spawn } from 'child_process';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { hostname, homedir } from 'os';
import { join, dirname } from 'path';

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

type PluginConfig = {
	backendUrl?: string;
	openclawAgentId?: string;
	pairingCode?: string;
	mockMode?: boolean;
	connectorName?: string;
	deviceId?: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function register(api: any) {
	const config: PluginConfig = api?.config ?? {};
	const CONNECTOR_ID = crypto.randomUUID();
	const CONNECTOR_VERSION = '1.0.0';

	const getBackendUrl = () => config.backendUrl ?? 'https://shot.epsilondelta.ai';
	const getAgentId = () => config.openclawAgentId ?? '';
	const getPairingCode = () => config.pairingCode ?? '';
	const isMockMode = () => config.mockMode === true;
	const getConnectorName = () => config.connectorName ?? 'SHOT Plugin Connector';
	const getDeviceId = () => config.deviceId ?? hostname();
	const getStatePath = () =>
		join(homedir(), '.openclaw', 'extensions', 'shot-game', 'state.json');

	let stopped = false;
	let activeWs: WebSocket | null = null;
	let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
	let lastHeartbeatAt: Date | null = null;
	let currentState: ConnectorState | null = null;

	async function readState(): Promise<ConnectorState | null> {
		try {
			const data = await readFile(getStatePath(), 'utf-8');
			return JSON.parse(data) as ConnectorState;
		} catch {
			return null;
		}
	}

	async function writeState(state: ConnectorState) {
		const statePath = getStatePath();
		await mkdir(dirname(statePath), { recursive: true });
		await writeFile(statePath, JSON.stringify(state, null, 2), 'utf-8');
	}

	function deriveWsUrl(state: ConnectorState) {
		const base = new URL(getBackendUrl());
		base.protocol = base.protocol === 'https:' ? 'wss:' : 'ws:';
		base.pathname = '/ws/bot-connector';
		base.search = new URLSearchParams({
			botId: state.botId,
			token: state.connectorToken,
			connectorId: state.connectorId,
			connectorName: getConnectorName(),
			connectorVersion: CONNECTOR_VERSION,
			deviceId: getDeviceId()
		}).toString();
		return base.toString();
	}

	async function redeemPairingCode(pairingCode: string): Promise<ConnectorState> {
		const response = await fetch(`${getBackendUrl()}/api/bots/pair/redeem`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				pairingCode,
				connectorId: CONNECTOR_ID,
				connectorName: getConnectorName(),
				connectorVersion: CONNECTOR_VERSION,
				deviceId: getDeviceId()
			})
		});

		if (!response.ok) {
			const text = await response.text();
			throw new Error(`Failed to redeem pairing code: ${response.status} ${text}`);
		}

		const data = (await response.json()) as RedeemResponse;
		const state: ConnectorState = {
			botId: data.botId,
			connectorId: data.connectorId,
			connectorToken: data.connectorToken
		};
		await writeState(state);
		return state;
	}

	function buildPrompt(payload: BotTurnRequestPayload): string {
		const me = payload.snapshot.players.find((p) => p.id === payload.snapshot.myPlayerId);
		const players = payload.snapshot.players
			.map(
				(p) =>
					`- ${p.name}: hp=${p.hp}/${p.maxHp}, alive=${p.alive}, jailed=${p.isJailed}, role=${p.role}, verified=${p.verified}`
			)
			.join('\n');
		const logs = payload.snapshot.logs
			.slice(-10)
			.map((e) => `- [${e.type}] ${e.text}`)
			.join('\n');
		const chats = payload.snapshot.chatMessages
			.slice(-10)
			.map((e) => `- ${e.playerName}: ${e.text}`)
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
			payload.validActions.find((a) => a.type === 'skip-chat') ??
			payload.validActions.find((a) => a.type === 'end-turn') ??
			payload.validActions[0] ??
			null
		);
	}

	async function decideWithOpenClaw(payload: BotTurnRequestPayload): Promise<GameAction | null> {
		const agentId = getAgentId();
		if (!agentId) return null;

		const prompt = buildPrompt(payload);

		return new Promise((resolve) => {
			const proc = spawn('openclaw', ['agent', '--agent', agentId, '--message', prompt]);
			let stdout = '';
			let stderr = '';

			proc.stdout.on('data', (data: Buffer) => {
				stdout += String(data);
			});
			proc.stderr.on('data', (data: Buffer) => {
				stderr += String(data);
			});
			proc.on('close', (code: number | null) => {
				if (code !== 0) {
					console.error('[shot-connector] openclaw agent failed:', stderr || stdout);
					resolve(null);
					return;
				}
				resolve(extractJsonAction(stdout));
			});
			proc.on('error', (err: Error) => {
				console.error('[shot-connector] failed to spawn openclaw:', err);
				resolve(null);
			});
		});
	}

	async function decideAction(payload: BotTurnRequestPayload): Promise<GameAction | null> {
		if (isMockMode()) return fallbackAction(payload);
		const action = await decideWithOpenClaw(payload);
		return action ?? fallbackAction(payload);
	}

	async function ensureState(): Promise<ConnectorState> {
		const saved = await readState();
		if (saved) return saved;
		const pairingCode = getPairingCode();
		if (!pairingCode) {
			throw new Error(
				'No connector state found and no pairingCode configured.\n' +
					'Get a pairing code from SHOT config page, then run: openclaw shot configure'
			);
		}
		return redeemPairingCode(pairingCode);
	}

	async function runLoop() {
		let state: ConnectorState;
		try {
			state = await ensureState();
			currentState = state;
		} catch (err) {
			console.error('[shot-connector] startup failed:', err);
			return;
		}

		let heartbeatIntervalMs = 10_000;

		while (!stopped) {
			const wsUrl = deriveWsUrl(state);
			console.log(`[shot-connector] connecting: ${wsUrl}`);

			try {
				await new Promise<void>((resolve) => {
					const ws = new WebSocket(wsUrl);
					activeWs = ws;

					const clearHb = () => {
						if (heartbeatTimer) clearInterval(heartbeatTimer);
						heartbeatTimer = null;
					};

					ws.onopen = () => {
						console.log('[shot-connector] connected');
						heartbeatTimer = setInterval(() => {
							if (ws.readyState !== WebSocket.OPEN) return;
							ws.send(
								JSON.stringify({
									type: 'heartbeat',
									botId: state.botId,
									connectorId: state.connectorId
								})
							);
							lastHeartbeatAt = new Date();
						}, heartbeatIntervalMs);
					};

					ws.onmessage = async (event: MessageEvent) => {
						const message = JSON.parse(String(event.data)) as
							| { type: 'hello_ack'; heartbeatIntervalMs: number }
							| { type: 'turn_request'; requestId: string; payload: BotTurnRequestPayload }
							| { type: 'error'; message: string }
							| { type: 'heartbeat_ack' };

						if (message.type === 'hello_ack') {
							heartbeatIntervalMs = message.heartbeatIntervalMs;
							console.log('[shot-connector] hello acknowledged');
							return;
						}
						if (message.type === 'heartbeat_ack') return;
						if (message.type === 'error') {
							console.error('[shot-connector] server error:', message.message);
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
						console.error('[shot-connector] websocket error');
					};

					ws.onclose = () => {
						clearHb();
						activeWs = null;
						if (!stopped) {
							console.log('[shot-connector] disconnected, retrying in 3s');
							setTimeout(resolve, 3000);
						} else {
							resolve();
						}
					};
				});
			} catch (error) {
				console.error('[shot-connector] fatal loop error:', error);
				if (!stopped) {
					await new Promise((r) => setTimeout(r, 3000));
				}
			}
		}
	}

	// Register persistent background service
	api.registerService({
		id: 'shot-connector',
		start: async () => {
			stopped = false;
			await runLoop();
		},
		stop: async () => {
			stopped = true;
			if (heartbeatTimer) {
				clearInterval(heartbeatTimer);
				heartbeatTimer = null;
			}
			if (activeWs) {
				activeWs.close();
				activeWs = null;
			}
		}
	});

	// Register CLI commands
	if (typeof api.registerCli === 'function') {
		api.registerCli(
			({ program }: { program: { command: (name: string) => unknown } }) => {
				const prog = program as unknown as {
					command: (name: string) => {
						description: (d: string) => { action: (fn: () => void) => void };
					};
				};

				prog
					.command('shot configure')
					.description('Show SHOT connector configuration instructions')
					.action(() => {
						console.log('\nCurrent SHOT connector config:');
						console.log(
							`  backendUrl:      ${config.backendUrl ?? '(not set — default: http://localhost:3001)'}`
						);
						console.log(`  openclawAgentId: ${config.openclawAgentId ?? '(not set)'}`);
						console.log(`  pairingCode:     ${config.pairingCode ? '(set)' : '(not set)'}`);
						console.log(`  mockMode:        ${config.mockMode ?? false}`);
						console.log(`  connectorName:   ${config.connectorName ?? '(default)'}`);
						console.log(`  deviceId:        ${config.deviceId ?? '(auto: hostname)'}`);
						console.log('\nTo configure, edit your OpenClaw config file:');
						console.log('  ~/.openclaw/config.yaml');
						console.log('  Under: plugins.entries.shot-game.config');
						console.log('\nRequired: backendUrl, openclawAgentId');
						console.log(
							'Optional: pairingCode (set once to pair, then remove), mockMode, connectorName, deviceId'
						);
						console.log('\nGet a pairingCode from: SHOT config page → Add Bot → Start Pairing');
					});

				prog
					.command('shot status')
					.description('Show SHOT connector connection status')
					.action(() => {
						const isConnected =
							activeWs !== null && (activeWs as WebSocket).readyState === WebSocket.OPEN;
						console.log('\nSHOT Connector Status:');
						console.log(`  Connection:     ${isConnected ? 'connected' : 'disconnected'}`);
						console.log(`  Paired:         ${currentState !== null ? 'yes' : 'no'}`);
						if (currentState) {
							console.log(`  Bot ID:         ${currentState.botId}`);
						}
						if (lastHeartbeatAt) {
							console.log(`  Last heartbeat: ${lastHeartbeatAt.toISOString()}`);
						}
						console.log(`  Backend URL:    ${getBackendUrl()}`);
						console.log(`  Mock mode:      ${isMockMode()}`);
						console.log(`  State file:     ${getStatePath()}`);
					});
			},
			{ commands: ['shot'] }
		);
	}
}
