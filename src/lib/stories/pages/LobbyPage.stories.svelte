<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import LobbyPage from '../../../routes/lobby/+page.svelte';

	const { Story } = defineMeta({
		title: 'Pages/Lobby',
		component: LobbyPage,
		parameters: {
			layout: 'fullscreen'
		}
	});

	const mockLobbies = [
		{ id: '1', name: 'Wild West Duel', icon: 'swords', currentPlayers: 3, maxPlayers: 4, status: 'waiting' },
		{ id: '2', name: 'Gold Rush Heist', icon: 'local_activity', currentPlayers: 4, maxPlayers: 4, status: 'full' },
		{ id: '3', name: 'Saloon Brawl', icon: 'castle', currentPlayers: 1, maxPlayers: 8, status: 'waiting' },
		{ id: '4', name: 'Train Robbery', icon: 'directions_run', currentPlayers: 5, maxPlayers: 6, status: 'starting_soon' },
		{ id: '5', name: 'Desert Showdown', icon: 'local_fire_department', currentPlayers: 2, maxPlayers: 4, status: 'in_progress' }
	];
</script>

<Story
	name="Default"
	args={{
		data: {
			lobbies: mockLobbies,
			username: 'Sheriff_Buck',
			avatarSrc: ''
		}
	}}
/>

<Story
	name="Empty"
	args={{
		data: {
			lobbies: [],
			username: 'Sheriff_Buck',
			avatarSrc: ''
		}
	}}
/>
