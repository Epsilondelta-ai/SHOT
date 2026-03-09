<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import ComicButton from './ComicButton.svelte';
	import { fn } from 'storybook/test';

	const { Story } = defineMeta({
		title: 'Login/ComicButton',
		component: ComicButton,
		tags: ['autodocs'],
		argTypes: {
			variant: {
				control: { type: 'select' },
				options: ['primary', 'secondary']
			},
			icon: { control: 'text' }
		},
		args: {
			onclick: fn()
		}
	});
</script>

<Story name="Primary" args={{ variant: 'primary', icon: 'login' }}>
	{#snippet children(args)}
		<ComicButton {...args}>Login</ComicButton>
	{/snippet}
</Story>

<Story name="Secondary" args={{ variant: 'secondary' }}>
	{#snippet children(args)}
		<ComicButton {...args}>Create Identity</ComicButton>
	{/snippet}
</Story>

<Story name="With Icon" args={{ variant: 'primary', icon: 'rocket_launch' }}>
	{#snippet children(args)}
		<ComicButton {...args}>Launch</ComicButton>
	{/snippet}
</Story>
