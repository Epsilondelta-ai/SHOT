<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import DemoPage from '../../../routes/demo/+page.svelte';

	const { Story } = defineMeta({
		title: 'Pages/Demo',
		component: DemoPage,
		parameters: {
			layout: 'fullscreen'
		}
	});
</script>

<Story name="Default" />
