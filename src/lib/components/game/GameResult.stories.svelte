<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import GameResult from './GameResult.svelte';

	const { Story } = defineMeta({
		title: 'Game/GameResult',
		component: GameResult,
		tags: ['autodocs'],
		parameters: {
			layout: 'fullscreen'
		}
	});
</script>

<Story
	name="Victory (My Win)"
	args={{
		winner: 'Outlaw_Jane',
		isMyWin: true
	}}
/>

<Story
	name="Defeat (Other Wins)"
	args={{
		winner: 'Sheriff_Buck',
		isMyWin: false
	}}
/>

<Story
	name="Draw"
	args={{
		isDraw: true
	}}
/>
