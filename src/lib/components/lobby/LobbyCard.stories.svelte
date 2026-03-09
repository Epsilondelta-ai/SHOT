<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import LobbyCard from './LobbyCard.svelte';
	import { fn } from 'storybook/test';

	const { Story } = defineMeta({
		title: 'Lobby/LobbyCard',
		component: LobbyCard,
		tags: ['autodocs'],
		argTypes: {
			status: {
				control: { type: 'select' },
				options: ['waiting', 'full', 'starting_soon', 'in_progress']
			},
			icon: { control: 'text' },
			name: { control: 'text' },
			currentPlayers: { control: 'number' },
			maxPlayers: { control: 'number' }
		},
		args: {
			onjoin: fn()
		}
	});
</script>

<Story
	name="Waiting"
	args={{ name: 'Wild West Duel', icon: 'swords', currentPlayers: 3, maxPlayers: 4, status: 'waiting' }}
/>

<Story
	name="Full"
	args={{ name: 'Gold Rush Heist', icon: 'local_activity', currentPlayers: 4, maxPlayers: 4, status: 'full' }}
/>

<Story
	name="Starting Soon"
	args={{ name: 'Train Robbery', icon: 'directions_run', currentPlayers: 5, maxPlayers: 6, status: 'starting_soon' }}
/>

<Story
	name="In Progress"
	args={{ name: 'Saloon Brawl', icon: 'castle', currentPlayers: 4, maxPlayers: 8, status: 'in_progress' }}
/>
