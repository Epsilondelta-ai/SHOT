<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import AdminPage from '../../../routes/admin/+page.svelte';

	const { Story } = defineMeta({
		title: 'Pages/Admin',
		component: AdminPage,
		parameters: {
			layout: 'fullscreen'
		}
	});
</script>

<Story name="Default" />
