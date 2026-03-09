<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import RoomChat from './RoomChat.svelte';
	import { fn } from 'storybook/test';

	const { Story } = defineMeta({
		title: 'Room/RoomChat',
		component: RoomChat,
		tags: ['autodocs'],
		args: {
			onsend: fn()
		}
	});
</script>

<Story
	name="With Messages"
	args={{
		messages: [
			{ id: '1', sender: '', text: 'Sheriff_Buck created the room.', isSystem: true },
			{ id: '2', sender: 'Sheriff_Buck', text: ' Welcome everyone!' },
			{ id: '3', sender: '', text: 'Outlaw_Jane joined.', isSystem: true },
			{ id: '4', sender: 'Doc_Holiday', text: ' Ready to go!' }
		]
	}}
/>

<Story
	name="Empty"
	args={{
		messages: []
	}}
/>

<Story
	name="Many Messages"
	args={{
		messages: [
			{ id: '1', sender: '', text: 'Room created.', isSystem: true },
			{ id: '2', sender: 'Player1', text: ' Hello!' },
			{ id: '3', sender: 'Player2', text: ' Hi there!' },
			{ id: '4', sender: 'Player3', text: ' Ready?' },
			{ id: '5', sender: 'Player1', text: ' Not yet...' },
			{ id: '6', sender: '', text: 'Player4 joined.', isSystem: true },
			{ id: '7', sender: 'Player4', text: " Let's go!" },
			{ id: '8', sender: 'Player2', text: ' OK ready!' },
			{ id: '9', sender: 'Player3', text: ' Same here' },
			{ id: '10', sender: '', text: 'All players ready!', isSystem: true }
		]
	}}
/>
