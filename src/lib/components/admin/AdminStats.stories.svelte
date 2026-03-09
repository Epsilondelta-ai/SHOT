<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import AdminStats from './AdminStats.svelte';

	const { Story } = defineMeta({
		title: 'Admin/AdminStats',
		component: AdminStats,
		tags: ['autodocs'],
		argTypes: {
			totalUsers: { control: 'number' },
			activeNow: { control: 'number' },
			activeRooms: { control: 'number' },
			gamesToday: { control: 'number' }
		}
	});
</script>

<Story
	name="Default"
	args={{
		totalUsers: 1284,
		activeNow: 47,
		activeRooms: 12,
		gamesToday: 89
	}}
/>

<Story
	name="Empty Server"
	args={{
		totalUsers: 3,
		activeNow: 0,
		activeRooms: 0,
		gamesToday: 0
	}}
/>
