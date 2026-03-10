<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import GamePage from '../../../routes/game/[id]/+page.svelte';

	const { Story } = defineMeta({
		title: 'Pages/Game',
		component: GamePage,
		parameters: {
			layout: 'fullscreen'
		}
	});
</script>

<!-- Default: 여러 카드를 보유한 상태 -->
<Story name="Full Hand - With Cards" />

<!-- 카드가 없는 경우 -->
<Story name="Empty Hand - No Cards">
	<svelte:fragment let:args>
		<GamePage {...args} />
	</svelte:fragment>
</Story>

<!-- 게임 종료 상태 -->
<Story name="Game Over">
	<svelte:fragment let:args>
		<GamePage
			{...args}
			initialPhase="finished"
			initialPlayers={[
				{ id: 'p1', name: 'Sheriff_Buck', hp: 0, maxHp: 3, alive: false, attacks: 1, cards: [], isJailed: false, role: 'normal' },
				{ id: 'p2', name: 'Outlaw_Jane', hp: 3, maxHp: 3, alive: true, attacks: 6, cards: [], isJailed: false, role: 'normal' },
				{ id: 'p3', name: 'Doc_Holiday', hp: 0, maxHp: 3, alive: false, attacks: 1, cards: [], isJailed: false, role: 'normal' },
				{ id: 'p4', name: 'Calamity_Sue', hp: 0, maxHp: 3, alive: false, attacks: 1, cards: [], isJailed: false, role: 'normal' },
				{ id: 'p5', name: 'Quick_Draw', hp: 2, maxHp: 3, alive: true, attacks: 1, cards: [], isJailed: false, role: 'normal' },
				{ id: 'p6', name: 'Gunslinger_Kate', hp: 0, maxHp: 3, alive: false, attacks: 2, cards: [], isJailed: false, role: 'normal' },
				{ id: 'p7', name: 'Bandit_Bob', hp: 0, maxHp: 3, alive: false, attacks: 1, cards: [], isJailed: false, role: 'normal' },
				{ id: 'p8', name: 'Lawman_Tom', hp: 0, maxHp: 3, alive: false, attacks: 1, cards: [], isJailed: false, role: 'normal' },
				{ id: 'p9', name: 'Undercover_Max', hp: 0, maxHp: 3, alive: false, attacks: 1, cards: [], isJailed: false, role: 'spy' },
				{ id: 'p10', name: 'Captain_Wilson', hp: 5, maxHp: 5, alive: true, attacks: 2, cards: [], isJailed: false, role: 'leader' },
				{ id: 'p11', name: 'Agent_Green', hp: 0, maxHp: 3, alive: false, attacks: 1, cards: [], isJailed: false, role: 'revealed' }
			]}
		/>
	</svelte:fragment>
</Story>
