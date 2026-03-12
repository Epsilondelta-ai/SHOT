import type { GameSnapshot } from './game';

export type ReplayRecord = {
	roomId: string;
	playerCount: number;
	playerNames: string[];
	winnerTeam: string | null;
	startedAt: number;
	finishedAt: number | null;
};

export type ReplayFrame = {
	id: string;
	seq: number;
	snapshot: GameSnapshot;
	actionSummary: string | null;
	createdAt: number;
};
