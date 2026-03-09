<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import AdminRoomList from './AdminRoomList.svelte';
	import { fn } from 'storybook/test';

	const { Story } = defineMeta({
		title: 'Admin/AdminRoomList',
		component: AdminRoomList,
		tags: ['autodocs'],
		args: {
			onclose: fn()
		}
	});
</script>

<Story
	name="Mixed Status"
	args={{
		rooms: [
			{ id: 'r1', name: 'Wild West Duel', host: 'Sheriff_Buck', currentPlayers: 3, maxPlayers: 4, status: 'waiting' },
			{ id: 'r2', name: 'Gold Rush Heist', host: 'Outlaw_Jane', currentPlayers: 4, maxPlayers: 4, status: 'in_progress' },
			{ id: 'r3', name: 'Saloon Brawl', host: 'Whiskey_Pete', currentPlayers: 2, maxPlayers: 8, status: 'waiting' }
		]
	}}
/>

<Story
	name="All In Progress"
	args={{
		rooms: [
			{ id: 'r1', name: 'Train Robbery', host: 'Doc_Holiday', currentPlayers: 6, maxPlayers: 6, status: 'in_progress' },
			{ id: 'r2', name: 'Gold Rush Heist', host: 'Outlaw_Jane', currentPlayers: 4, maxPlayers: 4, status: 'in_progress' }
		]
	}}
/>

<Story
	name="Empty"
	args={{
		rooms: []
	}}
/>
