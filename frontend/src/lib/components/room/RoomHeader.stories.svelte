<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import RoomHeader from './RoomHeader.svelte';

	const { Story } = defineMeta({
		title: 'Room/RoomHeader',
		component: RoomHeader,
		tags: ['autodocs'],
		parameters: {
			layout: 'fullscreen'
		},
		argTypes: {
			roomName: { control: 'text' },
			roomCode: { control: 'text' },
			currentPlayers: { control: 'number' },
			maxPlayers: { control: 'number' }
		}
	});
</script>

<Story
	name="Default"
	args={{
		roomName: 'Wild West Duel',
		roomCode: 'ABCD',
		currentPlayers: 3,
		maxPlayers: 4
	}}
/>

<Story
	name="Full Room"
	args={{
		roomName: 'Gold Rush Heist',
		roomCode: 'XY42',
		currentPlayers: 4,
		maxPlayers: 4
	}}
/>

<Story
	name="Single Player"
	args={{
		roomName: 'Saloon Brawl',
		roomCode: 'Z1K9',
		currentPlayers: 1,
		maxPlayers: 8
	}}
/>
