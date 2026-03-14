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
				name: 'Alpha Bot',
				active: true,
				presenceStatus: 'online',
				lastSeenAt: '2025-03-14T10:00:00Z',
				created: '2025-02-15',
				updated: '2025-03-08'
			},
			{
				id: 'b2',
				name: 'Beta Bot',
				active: true,
				presenceStatus: 'offline',
				lastSeenAt: '2025-03-13T08:00:00Z',
				created: '2025-03-01',
				updated: '2025-03-05'
			},
			{
				id: 'b3',
				name: 'Inactive Bot',
				active: false,
				presenceStatus: 'offline',
				lastSeenAt: null,
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
				active: true,
				presenceStatus: 'online',
				lastSeenAt: '2025-03-14T10:00:00Z',
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
