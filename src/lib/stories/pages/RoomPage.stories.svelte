<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import RoomPage from '../../../routes/room/[id]/+page.svelte';

	const { Story } = defineMeta({
		title: 'Pages/Room',
		component: RoomPage,
		parameters: {
			layout: 'fullscreen'
		}
	});
</script>

<Story name="Default" />
