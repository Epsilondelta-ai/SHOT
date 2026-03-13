import { describe, it, expect } from 'bun:test';
import type { GameAction, GameSnapshot } from './gameState';

// Local re-implementations of pure functions from llmPlayer.ts
// to avoid cross-file mock.module interference (games.test.ts mocks this module globally)

const MAX_HISTORY_MESSAGES = 400;

type ConversationMessage = {
	role: 'user' | 'assistant';
	content: string;
};

const conversationHistories = new Map<string, Map<string, ConversationMessage[]>>();

function getHistory(roomId: string, playerId: string): ConversationMessage[] {
	if (!conversationHistories.has(roomId)) {
		conversationHistories.set(roomId, new Map());
	}
	const roomHistories = conversationHistories.get(roomId)!;
	if (!roomHistories.has(playerId)) {
		roomHistories.set(playerId, []);
	}
	return roomHistories.get(playerId)!;
}

function appendToHistory(
	roomId: string,
	playerId: string,
	userMessage: string,
	assistantMessage: string,
): void {
	const history = getHistory(roomId, playerId);
	history.push(
		{ role: 'user', content: userMessage },
		{ role: 'assistant', content: assistantMessage },
	);
	while (history.length > MAX_HISTORY_MESSAGES) {
		history.shift();
		history.shift();
	}
}

function clearConversationHistory(roomId: string): void {
	conversationHistories.delete(roomId);
}

function parseActionFromResponse(
	text: string,
	validActions: GameAction[],
): GameAction | null {
	const match = text.match(/\{[\s\S]*\}/);
	if (!match) return null;

	try {
		const parsed = JSON.parse(match[0]) as Record<string, unknown>;
		if (typeof parsed.type !== 'string') return null;

		const validTypes = new Set(validActions.map((a) => a.type));
		if (!validTypes.has(parsed.type as GameAction['type'])) return null;

		return parsed as unknown as GameAction;
	} catch {
		return null;
	}
}

function getValidActions(snapshot: GameSnapshot, userId: string): GameAction[] {
	const me = snapshot.players.find((p) => p.userId === userId);
	if (!me || !me.alive) return [{ type: 'end-turn' }];
	if (snapshot.currentTurnPlayerId !== me.id) return [];

	const actions: GameAction[] = [];

	if (snapshot.phase === 'chatting') {
		actions.push({ type: 'chat', text: '' });
		actions.push({ type: 'skip-chat' });
		return actions;
	}

	if (snapshot.phase === 'acting') {
		if (snapshot.canReveal) {
			actions.push({ type: 'reveal' });
		}

		const alivePlayers = snapshot.players.filter(
			(p) => p.alive && p.id !== me.id,
		);

		if (me.attacks > 0) {
			for (const target of alivePlayers) {
				actions.push({ type: 'play-card', card: 'attack', targetId: target.id });
			}
		}

		const healTargets = snapshot.players.filter(
			(p) => p.alive && p.hp < p.maxHp,
		);
		if (me.cards.includes('heal') && healTargets.length > 0) {
			for (const target of healTargets) {
				actions.push({ type: 'play-card', card: 'heal', targetId: target.id });
			}
		}

		if (me.cards.includes('jail')) {
			for (const target of alivePlayers.filter((p) => !p.isJailed)) {
				actions.push({ type: 'play-card', card: 'jail', targetId: target.id });
			}
		}

		if (me.cards.includes('verify')) {
			const verifyTargets = alivePlayers.filter(
				(p) => p.role === 'normal' && !p.isJailed,
			);
			for (const target of verifyTargets) {
				actions.push({ type: 'play-card', card: 'verify', targetId: target.id });
			}
		}

		actions.push({ type: 'end-turn' });
	}

	return actions;
}

function buildPrompt(
	snapshot: GameSnapshot,
	validActions: GameAction[],
	userId: string,
): string {
	const me = snapshot.players.find((p) => p.userId === userId);
	const recentLogs = snapshot.logs.slice(-10);
	const recentChats = snapshot.chatMessages.slice(-10);

	const myStatus = me
		? `name=${me.name}, hp=${me.hp}/${me.maxHp}, alive=${me.alive}, jailed=${me.isJailed}, attacks=${me.attacks}, cards=${me.cards.join(',')}, role=${me.role}`
		: 'unknown';

	const playerList = snapshot.players
		.map(
			(p) =>
				`  - ${p.name}: hp=${p.hp}/${p.maxHp}, alive=${p.alive}, role=${p.role}, jailed=${p.isJailed}`,
		)
		.join('\n');

	const logText = recentLogs.map((l) => `  [${l.type}] ${l.text}`).join('\n');
	const chatText = recentChats
		.map((c) => `  ${c.playerName}: ${c.text}`)
		.join('\n');

	return `YOUR STATUS: ${myStatus}
ROUND: ${snapshot.round}
PHASE: ${snapshot.phase}

PLAYERS:
${playerList}

RECENT LOG:
${logText || '  (none)'}

CHAT HISTORY:
${chatText || '  (none)'}

VALID ACTIONS (choose exactly one):
${JSON.stringify(validActions, null, 2)}

Respond with ONLY a JSON object matching one of the valid actions above. No explanation, no markdown.`;
}

// ── Test Helpers ─────────────────────────────────────────────────────────────

function makePlayer(overrides: Partial<GameSnapshot['players'][0]> = {}): GameSnapshot['players'][0] {
	return {
		id: 'p1',
		userId: 'u1',
		name: 'Player 1',
		hp: 3,
		maxHp: 3,
		alive: true,
		role: 'spy',
		isJailed: false,
		attacks: 2,
		cards: [],
		verified: false,
		...overrides,
	};
}

function makeSnapshot(overrides: Partial<GameSnapshot> = {}): GameSnapshot {
	return {
		roomId: 'room-1',
		round: 1,
		maxRound: 5,
		phase: 'acting',
		currentTurnPlayerId: 'p1',
		viewerMode: 'player',
		myPlayerId: 'p1',
		myTeam: 'spies',
		remainingChatTurns: 0,
		canReveal: false,
		mustUseAttack: false,
		winnerTeam: null,
		players: [makePlayer()],
		logs: [],
		chatMessages: [],
		...overrides,
	};
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('parseActionFromResponse', () => {
	const validActions: GameAction[] = [
		{ type: 'end-turn' },
		{ type: 'play-card', card: 'attack', targetId: 'p2' },
		{ type: 'chat', text: '' },
	];

	it('parses valid JSON action', () => {
		const result = parseActionFromResponse('{"type":"end-turn"}', validActions);
		expect(result).toEqual({ type: 'end-turn' });
	});

	it('extracts JSON from surrounding text', () => {
		const result = parseActionFromResponse('I will attack! {"type":"end-turn"} Done.', validActions);
		expect(result).toEqual({ type: 'end-turn' });
	});

	it('returns null for non-JSON text', () => {
		expect(parseActionFromResponse('just text', validActions)).toBeNull();
	});

	it('returns null for invalid JSON', () => {
		expect(parseActionFromResponse('{broken json}', validActions)).toBeNull();
	});

	it('returns null when type is missing', () => {
		expect(parseActionFromResponse('{"card":"attack"}', validActions)).toBeNull();
	});

	it('returns null when type is not in valid actions', () => {
		expect(parseActionFromResponse('{"type":"reveal"}', validActions)).toBeNull();
	});

	it('parses complex action with extra fields', () => {
		const result = parseActionFromResponse('{"type":"play-card","card":"attack","targetId":"p2"}', validActions);
		expect(result).toEqual({ type: 'play-card', card: 'attack', targetId: 'p2' });
	});

	it('handles chat action with text', () => {
		const result = parseActionFromResponse('{"type":"chat","text":"Hello!"}', validActions);
		expect(result).toEqual({ type: 'chat', text: 'Hello!' });
	});
});

describe('getValidActions', () => {
	it('returns end-turn for dead player', () => {
		const snapshot = makeSnapshot({
			players: [makePlayer({ alive: false })],
		});
		const actions = getValidActions(snapshot, 'u1');
		expect(actions).toEqual([{ type: 'end-turn' }]);
	});

	it('returns empty array when not current turn', () => {
		const snapshot = makeSnapshot({
			currentTurnPlayerId: 'p2',
			players: [makePlayer()],
		});
		const actions = getValidActions(snapshot, 'u1');
		expect(actions).toEqual([]);
	});

	it('returns chat and skip-chat during chatting phase', () => {
		const snapshot = makeSnapshot({
			phase: 'chatting',
			players: [makePlayer()],
		});
		const actions = getValidActions(snapshot, 'u1');
		expect(actions).toEqual([
			{ type: 'chat', text: '' },
			{ type: 'skip-chat' },
		]);
	});

	it('includes reveal when canReveal is true', () => {
		const snapshot = makeSnapshot({
			canReveal: true,
			players: [makePlayer({ attacks: 0 })],
		});
		const actions = getValidActions(snapshot, 'u1');
		expect(actions[0]).toEqual({ type: 'reveal' });
	});

	it('includes attack actions when player has attacks', () => {
		const p2 = makePlayer({ id: 'p2', userId: 'u2', name: 'Player 2' });
		const snapshot = makeSnapshot({
			players: [makePlayer({ attacks: 1 }), p2],
		});
		const actions = getValidActions(snapshot, 'u1');
		const attackActions = actions.filter(a => a.type === 'play-card' && 'card' in a && a.card === 'attack');
		expect(attackActions.length).toBe(1);
		expect(attackActions[0]).toEqual({ type: 'play-card', card: 'attack', targetId: 'p2' });
	});

	it('includes heal actions for injured players', () => {
		const p2 = makePlayer({ id: 'p2', userId: 'u2', hp: 1, maxHp: 3 });
		const snapshot = makeSnapshot({
			players: [makePlayer({ attacks: 0, cards: ['heal'] }), p2],
		});
		const actions = getValidActions(snapshot, 'u1');
		const healActions = actions.filter(a => a.type === 'play-card' && 'card' in a && a.card === 'heal');
		expect(healActions.length).toBeGreaterThan(0);
	});

	it('includes jail actions for non-jailed alive players', () => {
		const p2 = makePlayer({ id: 'p2', userId: 'u2', isJailed: false });
		const p3 = makePlayer({ id: 'p3', userId: 'u3', isJailed: true });
		const snapshot = makeSnapshot({
			players: [makePlayer({ attacks: 0, cards: ['jail'] }), p2, p3],
		});
		const actions = getValidActions(snapshot, 'u1');
		const jailActions = actions.filter(a => a.type === 'play-card' && 'card' in a && a.card === 'jail');
		expect(jailActions.length).toBe(1);
		expect(jailActions[0]).toEqual({ type: 'play-card', card: 'jail', targetId: 'p2' });
	});

	it('includes verify actions for normal non-jailed players', () => {
		const p2 = makePlayer({ id: 'p2', userId: 'u2', role: 'normal', isJailed: false });
		const p3 = makePlayer({ id: 'p3', userId: 'u3', role: 'spy', isJailed: false });
		const snapshot = makeSnapshot({
			players: [makePlayer({ attacks: 0, cards: ['verify'] }), p2, p3],
		});
		const actions = getValidActions(snapshot, 'u1');
		const verifyActions = actions.filter(a => a.type === 'play-card' && 'card' in a && a.card === 'verify');
		expect(verifyActions.length).toBe(1);
		expect(verifyActions[0]).toEqual({ type: 'play-card', card: 'verify', targetId: 'p2' });
	});

	it('always includes end-turn in acting phase', () => {
		const snapshot = makeSnapshot({
			players: [makePlayer({ attacks: 0 })],
		});
		const actions = getValidActions(snapshot, 'u1');
		expect(actions[actions.length - 1]).toEqual({ type: 'end-turn' });
	});
});

describe('buildPrompt', () => {
	it('includes player status in prompt', () => {
		const snapshot = makeSnapshot({
			players: [makePlayer({ name: 'TestBot', hp: 2, maxHp: 3, attacks: 1, cards: ['heal'] })],
		});
		const prompt = buildPrompt(snapshot, [{ type: 'end-turn' }], 'u1');
		expect(prompt).toContain('name=TestBot');
		expect(prompt).toContain('hp=2/3');
		expect(prompt).toContain('attacks=1');
		expect(prompt).toContain('cards=heal');
	});

	it('includes round and phase', () => {
		const snapshot = makeSnapshot({ round: 3, phase: 'acting' });
		const prompt = buildPrompt(snapshot, [{ type: 'end-turn' }], 'u1');
		expect(prompt).toContain('ROUND: 3');
		expect(prompt).toContain('PHASE: acting');
	});

	it('includes player list', () => {
		const snapshot = makeSnapshot({
			players: [
				makePlayer({ name: 'Alice' }),
				makePlayer({ id: 'p2', userId: 'u2', name: 'Bob', hp: 1, maxHp: 3 }),
			],
		});
		const prompt = buildPrompt(snapshot, [{ type: 'end-turn' }], 'u1');
		expect(prompt).toContain('Alice');
		expect(prompt).toContain('Bob');
	});

	it('shows (none) when no logs or chat', () => {
		const snapshot = makeSnapshot({ logs: [], chatMessages: [] });
		const prompt = buildPrompt(snapshot, [{ type: 'end-turn' }], 'u1');
		expect(prompt).toContain('(none)');
	});

	it('includes valid actions JSON', () => {
		const actions: GameAction[] = [{ type: 'end-turn' }, { type: 'reveal' }];
		const snapshot = makeSnapshot();
		const prompt = buildPrompt(snapshot, actions, 'u1');
		expect(prompt).toContain('"type": "end-turn"');
		expect(prompt).toContain('"type": "reveal"');
	});

	it('shows unknown status for missing player', () => {
		const snapshot = makeSnapshot({ players: [] });
		const prompt = buildPrompt(snapshot, [{ type: 'end-turn' }], 'u999');
		expect(prompt).toContain('YOUR STATUS: unknown');
	});
});

describe('conversation history', () => {
	it('starts with empty history', () => {
		const history = getHistory('test-room', 'test-player');
		expect(history).toEqual([]);
	});

	it('appends user and assistant messages', () => {
		appendToHistory('hist-room', 'hist-player', 'Hello', 'Hi there');
		const history = getHistory('hist-room', 'hist-player');
		expect(history).toEqual([
			{ role: 'user', content: 'Hello' },
			{ role: 'assistant', content: 'Hi there' },
		]);
	});

	it('clears history for a room', () => {
		appendToHistory('clear-room', 'p1', 'msg1', 'resp1');
		clearConversationHistory('clear-room');
		const history = getHistory('clear-room', 'p1');
		expect(history).toEqual([]);
	});

	it('maintains separate histories per player', () => {
		appendToHistory('multi-room', 'player-a', 'A says', 'A response');
		appendToHistory('multi-room', 'player-b', 'B says', 'B response');
		expect(getHistory('multi-room', 'player-a')).toEqual([
			{ role: 'user', content: 'A says' },
			{ role: 'assistant', content: 'A response' },
		]);
		expect(getHistory('multi-room', 'player-b')).toEqual([
			{ role: 'user', content: 'B says' },
			{ role: 'assistant', content: 'B response' },
		]);
	});

	it('enforces sliding window limit', () => {
		const roomId = 'window-room';
		const playerId = 'window-player';
		// Add more than MAX_HISTORY_MESSAGES/2 pairs
		for (let i = 0; i < 210; i++) {
			appendToHistory(roomId, playerId, `user-${i}`, `assistant-${i}`);
		}
		const history = getHistory(roomId, playerId);
		expect(history.length).toBeLessThanOrEqual(MAX_HISTORY_MESSAGES);
		// Should contain the latest messages
		expect(history[history.length - 1].content).toBe('assistant-209');
		expect(history[history.length - 2].content).toBe('user-209');
	});
});
