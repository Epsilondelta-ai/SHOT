export type ActionCard = 'attack' | 'heal' | 'jail' | 'verify';
export type SpecialCard = 'heal' | 'jail' | 'verify';
export type Role = 'normal' | 'spy' | 'leader' | 'revealed';
export type WinnerTeam = 'agents' | 'spies' | 'draw';

export type GamePlayerData = {
	id: string;
	userId: string;
	name: string;
	hp: number;
	maxHp: number;
	alive: boolean;
	isJailed: boolean;
	attacks: number;
	cards: SpecialCard[];
	role: Role;
	verified: boolean;
};

export type LogEntry = {
	id: string;
	text: string;
	type: 'shot' | 'eliminated' | 'round' | 'result';
};

export type ChatMessage = {
	id: string;
	playerId: string;
	playerName: string;
	text: string;
};

export type GameSnapshot = {
	roomId: string;
	round: number;
	currentTurnPlayerId: string;
	viewerMode: 'player' | 'spectator';
	myPlayerId: string | null;
	myTeam: WinnerTeam | null;
	phase: 'chatting' | 'acting' | 'finished';
	remainingChatTurns: number;
	canReveal: boolean;
	winnerTeam: WinnerTeam | null;
	players: GamePlayerData[];
	logs: LogEntry[];
	chatMessages: ChatMessage[];
};

export type GameAction =
	| { type: 'chat'; text: string }
	| { type: 'skip-chat' }
	| { type: 'reveal' }
	| { type: 'play-card'; card: ActionCard; targetId?: string }
	| { type: 'end-turn' };
