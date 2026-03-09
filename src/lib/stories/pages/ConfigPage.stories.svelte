<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import ConfigPage from '../../../routes/config/+page.svelte';

	const { Story } = defineMeta({
		title: 'Pages/ConfigPage',
		component: ConfigPage,
		tags: ['autodocs'],
		parameters: {
			layout: 'fullscreen'
		}
	});
</script>

<Story name="Default" />

<Story name="Bot Tab Active" />
