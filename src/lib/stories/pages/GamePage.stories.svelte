<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import GamePage from '../../../routes/game/[id]/+page.svelte';

	const { Story } = defineMeta({
		title: 'Pages/Game',
		component: GamePage,
		parameters: {
			layout: 'fullscreen'
		}
	});
</script>

<Story name="Default" />
