<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import SignupPage from '../../../routes/signup/+page.svelte';

	const { Story } = defineMeta({
		title: 'Pages/Signup',
		component: SignupPage,
		parameters: {
			layout: 'fullscreen'
		}
	});
</script>

<Story name="Default" />
