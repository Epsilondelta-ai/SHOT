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
			name: 'Discord Bot',
			apiKey: 'MTk4NjIyNDgzNDU5Mjk1MDcy...',
			webhookUrl: 'https://discord.com/api/webhooks/123456/abcdef',
			active: true,
			created: '2025-02-15',
			updated: '2025-03-08'
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
