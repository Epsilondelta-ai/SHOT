<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import GameHistory from './GameHistory.svelte';

	const { Story } = defineMeta({
		title: 'Mypage/GameHistory',
		component: GameHistory,
		tags: ['autodocs'],
		parameters: {
			layout: 'centered'
		}
	});
</script>

<Story
	name="With Replays"
	args={{
		replays: [
			{
				roomId: 'room-1',
				playerCount: 5,
				playerNames: ['Alice', 'Bob', 'Charlie', 'Dave', 'Eve'],
				winnerTeam: 'agents',
				startedAt: Date.now() - 3600000,
				finishedAt: Date.now() - 1800000,
				participationType: 'player'
			},
			{
				roomId: 'room-2',
				playerCount: 6,
				playerNames: ['Frank', 'Grace', 'Heidi'],
				winnerTeam: 'spies',
				startedAt: Date.now() - 86400000,
				finishedAt: Date.now() - 82800000,
				participationType: 'spectator'
			},
			{
				roomId: 'room-3',
				playerCount: 5,
				playerNames: ['Ivan', 'Judy', 'Karl', 'Laura', 'Mallory'],
				winnerTeam: null,
				startedAt: Date.now() - 172800000,
				finishedAt: Date.now() - 169200000,
				participationType: 'player'
			}
		]
	}}
/>

<Story
	name="Empty"
	args={{
		replays: []
	}}
/>
