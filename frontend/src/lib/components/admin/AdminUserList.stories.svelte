<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import AdminUserList from './AdminUserList.svelte';
	import { fn } from 'storybook/test';

	const { Story } = defineMeta({
		title: 'Admin/AdminUserList',
		component: AdminUserList,
		tags: ['autodocs'],
		args: {
			onban: fn(),
			onunban: fn()
		}
	});
</script>

<Story
	name="With Users"
	args={{
		users: [
			{
				id: 'u1',
				name: 'Sheriff_Buck',
				email: 'buck@shot.com',
				games: 128,
				joined: '2025-01-15',
				banned: false
			},
			{
				id: 'u2',
				name: 'Outlaw_Jane',
				email: 'jane@shot.com',
				games: 95,
				joined: '2025-02-03',
				banned: false
			},
			{
				id: 'u3',
				name: 'Calamity_Sue',
				email: 'sue@shot.com',
				games: 12,
				joined: '2025-03-01',
				banned: true
			}
		]
	}}
/>

<Story
	name="All Active"
	args={{
		users: [
			{
				id: 'u1',
				name: 'Sheriff_Buck',
				email: 'buck@shot.com',
				games: 128,
				joined: '2025-01-15',
				banned: false
			},
			{
				id: 'u2',
				name: 'Doc_Holiday',
				email: 'doc@shot.com',
				games: 67,
				joined: '2025-02-20',
				banned: false
			}
		]
	}}
/>

<Story
	name="Empty"
	args={{
		users: []
	}}
/>
