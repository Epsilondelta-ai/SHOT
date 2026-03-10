<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import ConfigBotList from './ConfigBotList.svelte';
	import { fn } from 'storybook/test';

	const { Story } = defineMeta({
		title: 'Config/ConfigBotList',
		component: ConfigBotList,
		tags: ['autodocs'],
		args: {
			onedit: fn(),
			ondelete: fn()
		}
	});
</script>

<Story
	name="Full List"
	args={{
		bots: [
			{
				id: 'b1',
				name: 'Discord Bot',
				apiKey: 'MTk4NjIyNDgzNDU5Mjk1MDcy...',
				webhookUrl: 'https://discord.com/api/webhooks/123456/abcdef',
				active: true,
				created: '2025-02-15',
				updated: '2025-03-08'
			},
			{
				id: 'b2',
				name: 'Telegram Bot',
				apiKey: '123456:ABCDEfghijklmnopqrstuvwxyz',
				webhookUrl: '',
				active: false,
				created: '2025-03-01',
				updated: '2025-03-05'
			}
		]
	}}
/>

<Story
	name="Single Active Bot"
	args={{
		bots: [
			{
				id: 'b1',
				name: 'Production Bot',
				apiKey: 'sk-proj-abc123def456',
				webhookUrl: 'https://example.com/webhook',
				active: true,
				created: '2025-03-08',
				updated: '2025-03-08'
			}
		]
	}}
/>

<Story
	name="Empty"
	args={{
		bots: []
	}}
/>
