<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import ConfigBotForm from './ConfigBotForm.svelte';
	import { fn } from 'storybook/test';

	const { Story } = defineMeta({
		title: 'Config/ConfigBotForm',
		component: ConfigBotForm,
		tags: ['autodocs'],
		parameters: {
			layout: 'centered'
		},
		args: {
			onsave: fn(),
			oncancel: fn()
		}
	});
</script>

<Story
	name="Create New"
	args={{
		isOpen: true,
		editingBot: null
	}}
/>

<Story
	name="Edit Existing"
	args={{
		isOpen: true,
		editingBot: {
			id: 'b1',
			name: 'Alpha Bot',
			active: true
		}
	}}
/>

<Story
	name="Closed"
	args={{
		isOpen: false,
		editingBot: null
	}}
/>
