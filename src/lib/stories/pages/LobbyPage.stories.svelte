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
</script>

<Story name="Default" />
