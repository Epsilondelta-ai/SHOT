<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import LobbyTabs from './LobbyTabs.svelte';
	import { fn } from 'storybook/test';

	const { Story } = defineMeta({
		title: 'Lobby/LobbyTabs',
		component: LobbyTabs,
		tags: ['autodocs'],
		argTypes: {
			active: {
				control: { type: 'select' },
				options: ['all', 'in_progress', 'waiting']
			}
		},
		args: {
			onchange: fn()
		}
	});
</script>

<Story name="All Selected" args={{ active: 'all' }} />

<Story name="In Progress Selected" args={{ active: 'in_progress' }} />

<Story name="Waiting Selected" args={{ active: 'waiting' }} />
