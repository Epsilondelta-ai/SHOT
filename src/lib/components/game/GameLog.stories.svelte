<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import GameLog from './GameLog.svelte';

	const { Story } = defineMeta({
		title: 'Game/GameLog',
		component: GameLog,
		tags: ['autodocs']
	});
</script>

<Story
	name="With Entries"
	args={{
		logs: [
			{ id: '1', text: 'Round 1 starts!', type: 'round' },
			{ id: '2', text: 'Sheriff_Buck shot Doc_Holiday!', type: 'shot' },
			{ id: '3', text: 'Doc_Holiday shot Calamity_Sue!', type: 'shot' },
			{ id: '4', text: 'Calamity_Sue eliminated!', type: 'eliminated' },
			{ id: '5', text: 'Round 2 starts!', type: 'round' }
		]
	}}
/>

<Story
	name="Empty"
	args={{
		logs: []
	}}
/>

<Story
	name="Game Over"
	args={{
		logs: [
			{ id: '1', text: 'Round 3 starts!', type: 'round' },
			{ id: '2', text: 'Sheriff_Buck shot Outlaw_Jane!', type: 'shot' },
			{ id: '3', text: 'Outlaw_Jane eliminated!', type: 'eliminated' },
			{ id: '4', text: 'Winner: Sheriff_Buck!', type: 'result' }
		]
	}}
/>
