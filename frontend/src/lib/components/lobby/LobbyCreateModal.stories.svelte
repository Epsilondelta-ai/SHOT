<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import LobbyCreateModal from './LobbyCreateModal.svelte';
	import { fn } from 'storybook/test';

	const { Story } = defineMeta({
		title: 'Lobby/LobbyCreateModal',
		component: LobbyCreateModal,
		tags: ['autodocs'],
		parameters: {
			layout: 'centered'
		},
		args: {
			oncreate: fn(),
			oncancel: fn()
		}
	});
</script>

<Story
	name="Open"
	args={{
		isOpen: true
	}}
/>

<Story
	name="Closed"
	args={{
		isOpen: false
	}}
/>
