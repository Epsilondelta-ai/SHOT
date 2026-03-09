<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import HomePage from '../../../routes/+page.svelte';

	const { Story } = defineMeta({
		title: 'Pages/Home',
		component: HomePage,
		parameters: {
			layout: 'fullscreen'
		}
	});
</script>

<Story name="Default" />
