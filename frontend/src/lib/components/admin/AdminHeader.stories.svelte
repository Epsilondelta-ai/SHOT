<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import AdminHeader from './AdminHeader.svelte';
	import { fn } from 'storybook/test';

	const { Story } = defineMeta({
		title: 'Admin/AdminHeader',
		component: AdminHeader,
		tags: ['autodocs'],
		parameters: {
			layout: 'fullscreen'
		},
		args: {
			onchange: fn()
		}
	});
</script>

<Story
	name="Dashboard Tab"
	args={{
		activeTab: 'dashboard'
	}}
/>

<Story
	name="Users Tab"
	args={{
		activeTab: 'users'
	}}
/>

<Story
	name="Rooms Tab"
	args={{
		activeTab: 'rooms'
	}}
/>

<Story
	name="LLM Tab"
	args={{
		activeTab: 'llm'
	}}
/>
