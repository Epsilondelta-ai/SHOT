<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import RoomBotPlayerPanel from './RoomBotPlayerPanel.svelte';
	import { fn } from 'storybook/test';

	const { Story } = defineMeta({
		title: 'Room/RoomBotPlayerPanel',
		component: RoomBotPlayerPanel,
		tags: ['autodocs'],
		parameters: {
			layout: 'centered'
		},
		args: {
			onadd: fn()
		}
	});
</script>

<Story
	name="With Bots"
	args={{
		bots: [
			{ id: 'bot-1', name: 'AggressiveBot' },
			{ id: 'bot-2', name: 'DefensiveBot' },
			{ id: 'bot-3', name: 'RandomBot' }
		],
		disabled: false
	}}
/>

<Story
	name="Disabled"
	args={{
		bots: [
			{ id: 'bot-1', name: 'AggressiveBot' },
			{ id: 'bot-2', name: 'DefensiveBot' }
		],
		disabled: true
	}}
/>

<Story
	name="No Bots Available"
	args={{
		bots: [],
		disabled: false
	}}
/>
