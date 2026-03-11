<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import GamePage from '../../../routes/game/[id]/+page.svelte';

	const { Story } = defineMeta({
		title: 'Pages/Game',
		component: GamePage,
		parameters: {
			layout: 'fullscreen'
		}
	});

	type Card = 'heal' | 'jail' | 'verify';
	type Role = 'normal' | 'spy' | 'leader' | 'revealed';
	type GamePlayerData = {
		id: string;
		userId: string;
		name: string;
		hp: number;
		maxHp: number;
		alive: boolean;
		isJailed?: boolean;
		attacks?: number;
		cards?: Card[];
		role?: Role;
	};

	const basePlayers: GamePlayerData[] = [
		{
			id: 'p1',
			userId: 'u1',
			name: 'Sheriff_Buck',
			hp: 3,
			maxHp: 3,
			alive: true,
			attacks: 1,
			cards: [],
			isJailed: false,
			role: 'normal'
		},
		{
			id: 'p2',
			userId: 'u2',
			name: 'Outlaw_Jane',
			hp: 3,
			maxHp: 3,
			alive: true,
			attacks: 6,
			cards: [],
			isJailed: false,
			role: 'normal'
		},
		{
			id: 'p3',
			userId: 'u3',
			name: 'Doc_Holiday',
			hp: 2,
			maxHp: 3,
			alive: true,
			attacks: 1,
			cards: [],
			isJailed: false,
			role: 'normal'
		},
		{
			id: 'p4',
			userId: 'u4',
			name: 'Calamity_Sue',
			hp: 0,
			maxHp: 3,
			alive: false,
			attacks: 1,
			cards: [],
			isJailed: false,
			role: 'normal'
		},
		{
			id: 'p5',
			userId: 'u5',
			name: 'Quick_Draw',
			hp: 3,
			maxHp: 3,
			alive: true,
			attacks: 1,
			cards: ['verify'],
			isJailed: true,
			role: 'normal'
		},
		{
			id: 'p6',
			userId: 'u6',
			name: 'Gunslinger_Kate',
			hp: 1,
			maxHp: 3,
			alive: true,
			attacks: 2,
			cards: ['heal', 'jail'],
			isJailed: false,
			role: 'normal'
		},
		{
			id: 'p7',
			userId: 'u7',
			name: 'Bandit_Bob',
			hp: 3,
			maxHp: 3,
			alive: true,
			attacks: 1,
			cards: [],
			isJailed: false,
			role: 'normal'
		},
		{
			id: 'p8',
			userId: 'u8',
			name: 'Lawman_Tom',
			hp: 2,
			maxHp: 3,
			alive: true,
			attacks: 1,
			cards: ['verify'],
			isJailed: false,
			role: 'normal'
		},
		{
			id: 'p9',
			userId: 'u9',
			name: 'Undercover_Max',
			hp: 3,
			maxHp: 3,
			alive: true,
			attacks: 1,
			cards: [],
			isJailed: false,
			role: 'spy'
		},
		{
			id: 'p10',
			userId: 'u10',
			name: 'Captain_Wilson',
			hp: 5,
			maxHp: 5,
			alive: true,
			attacks: 2,
			cards: [],
			isJailed: false,
			role: 'leader'
		},
		{
			id: 'p11',
			userId: 'u11',
			name: 'Agent_Green',
			hp: 3,
			maxHp: 3,
			alive: true,
			attacks: 1,
			cards: [],
			isJailed: false,
			role: 'revealed'
		}
	];

	const fullHandPlayers = basePlayers.map((p) =>
		p.id === 'p2'
			? { ...p, cards: ['heal', 'heal', 'jail', 'verify'] as ('heal' | 'jail' | 'verify')[] }
			: p
	);

	const gameOverPlayers = basePlayers.map((p) =>
		['p1', 'p3', 'p4', 'p6', 'p7', 'p8', 'p9', 'p11'].includes(p.id)
			? { ...p, hp: 0, alive: false }
			: p
	);

	const baseLogs: { id: string; text: string; type: 'shot' | 'eliminated' | 'round' | 'result' }[] =
		[
			{ id: '1', text: 'Round 1 started', type: 'round' },
			{ id: '2', text: 'Sheriff_Buck shot Doc_Holiday', type: 'shot' },
			{ id: '3', text: 'Doc_Holiday shot Calamity_Sue', type: 'shot' },
			{ id: '4', text: 'Calamity_Sue shot Doc_Holiday', type: 'shot' },
			{ id: '5', text: 'Calamity_Sue was eliminated', type: 'eliminated' },
			{ id: '6', text: 'Round 2 started', type: 'round' }
		];

	function buildGame(
		players: GamePlayerData[],
		overrides: Partial<{
			viewerMode: 'player' | 'spectator';
			phase: 'chatting' | 'acting' | 'finished';
			remainingChatTurns: number;
			canReveal: boolean;
			winnerTeam: 'agents' | 'spies' | null;
			myTeam: 'agents' | 'spies' | null;
			myPlayerId: string | null;
		}> = {}
	) {
		return {
			game: {
				roomId: 'story-room',
				round: 2,
				currentTurnPlayerId: 'p2',
				viewerMode: overrides.viewerMode ?? 'player',
				myPlayerId: overrides.myPlayerId ?? 'p2',
				myTeam: overrides.myTeam ?? 'agents',
				phase: overrides.phase ?? 'acting',
				remainingChatTurns: overrides.remainingChatTurns ?? 0,
				canReveal: overrides.canReveal ?? false,
				winnerTeam: overrides.winnerTeam ?? null,
				players,
				logs: baseLogs,
				chatMessages: [
					{ id: 'c1', playerId: 'p1', playerName: 'Sheriff_Buck', text: 'Watch p9.' },
					{ id: 'c2', playerId: 'p2', playerName: 'Outlaw_Jane', text: 'I am checking.' }
				]
			}
		};
	}
</script>

<!-- Default: 여러 카드를 보유한 상태 -->
<Story name="Full Hand - With Cards" asChild>
	<GamePage data={buildGame(fullHandPlayers)} />
</Story>

<!-- 카드가 없는 경우 -->
<Story name="Empty Hand - No Cards" asChild>
	<GamePage
		data={buildGame(basePlayers, { phase: 'chatting', remainingChatTurns: 1, canReveal: true })}
	/>
</Story>

<!-- 게임 종료 상태 -->
<Story name="Game Over" asChild>
	<GamePage data={buildGame(gameOverPlayers, { phase: 'finished', winnerTeam: 'agents' })} />
</Story>

<!-- 내가 죽은 뒤 관전하는 상태 -->
<Story name="Died - Spectating" asChild>
	<GamePage data={buildGame(basePlayers, { myPlayerId: 'p4', phase: 'acting' })} />
</Story>
