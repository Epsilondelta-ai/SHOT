<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import LoginHeader from './LoginHeader.svelte';

	const { Story } = defineMeta({
		title: 'Login/LoginHeader',
		component: LoginHeader,
		tags: ['autodocs'],
		argTypes: {
			title: { control: 'text' },
			subtitle: { control: 'text' }
		}
	});
</script>

<Story name="Default" args={{ title: 'SHOT!', subtitle: '' }} />

<Story name="Custom" args={{ title: 'BOOM!', subtitle: 'Welcome Back, Hero' }} />
