<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import PlayerSlot from './PlayerSlot.svelte';
	import { fn } from 'storybook/test';

	const { Story } = defineMeta({
		title: 'Room/PlayerSlot',
		component: PlayerSlot,
		tags: ['autodocs'],
		argTypes: {
			isHost: { control: 'boolean' },
			isMe: { control: 'boolean' }
		}
	});
</script>

<Story
	name="Ready"
	args={{
		player: { name: 'Sheriff_Buck', ready: true },
		isHost: false,
		isMe: false
	}}
/>

<Story
	name="Not Ready"
	args={{
		player: { name: 'Outlaw_Jane', ready: false },
		isHost: false,
		isMe: false
	}}
/>

<Story
	name="Host"
	args={{
		player: { name: 'Sheriff_Buck', ready: true },
		isHost: true,
		isMe: false
	}}
/>

<Story
	name="Current Player"
	args={{
		player: { name: 'Outlaw_Jane', ready: false },
		isHost: false,
		isMe: true,
		ontoggleReady: fn()
	}}
/>

<Story
	name="Host Can Kick"
	args={{
		player: { name: 'Doc_Holiday', ready: true },
		isHost: false,
		isMe: false,
		onkick: fn()
	}}
/>

<Story name="Empty Slot" args={{}} />
