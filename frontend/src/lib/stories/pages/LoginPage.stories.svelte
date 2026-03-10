<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import LoginPage from '../../../routes/login/+page.svelte';

	const { Story } = defineMeta({
		title: 'Pages/Login',
		component: LoginPage,
		parameters: {
			layout: 'fullscreen'
		}
	});
</script>

<Story name="Default" />
