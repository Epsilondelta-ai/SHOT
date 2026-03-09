<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import OrDivider from './OrDivider.svelte';

	const { Story } = defineMeta({
		title: 'Login/OrDivider',
		component: OrDivider,
		tags: ['autodocs'],
		argTypes: {
			text: { control: 'text' }
		}
	});
</script>

<Story name="Default" args={{ text: 'OR' }} />

<Story name="Custom Text" args={{ text: 'ALSO' }} />
