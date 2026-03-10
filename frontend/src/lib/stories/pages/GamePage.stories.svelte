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
		p.id === 'p2' ? { ...p, cards: ['heal', 'heal', 'jail', 'verify'] as ('heal' | 'jail' | 'verify')[] } : p
	);

	const gameOverPlayers = basePlayers.map((p) =>
		['p1', 'p3', 'p4', 'p6', 'p7', 'p8', 'p9', 'p11'].includes(p.id)
			? { ...p, hp: 0, alive: false }
			: p
	);

	const baseLogs: { id: string; text: string; type: 'shot' | 'eliminated' | 'round' | 'result' }[] = [
		{ id: '1', text: 'Round 1 started', type: 'round' },
		{ id: '2', text: 'Sheriff_Buck shot Doc_Holiday', type: 'shot' },
		{ id: '3', text: 'Doc_Holiday shot Calamity_Sue', type: 'shot' },
		{ id: '4', text: 'Calamity_Sue shot Doc_Holiday', type: 'shot' },
		{ id: '5', text: 'Calamity_Sue was eliminated', type: 'eliminated' },
		{ id: '6', text: 'Round 2 started', type: 'round' }
	];
</script>

<!-- Default: 여러 카드를 보유한 상태 -->
<Story name="Full Hand - With Cards" asChild>
	<GamePage initialPlayers={fullHandPlayers} initialLogs={baseLogs} />
</Story>

<!-- 카드가 없는 경우 -->
<Story name="Empty Hand - No Cards" asChild>
	<GamePage initialPlayers={basePlayers} initialLogs={baseLogs} />
</Story>

<!-- 게임 종료 상태 -->
<Story name="Game Over" asChild>
	<GamePage initialPhase="died" initialPlayers={gameOverPlayers} initialLogs={baseLogs} />
</Story>
