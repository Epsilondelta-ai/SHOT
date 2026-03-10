<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import AdminUnbanModal from './AdminUnbanModal.svelte';
	import { fn } from 'storybook/test';

	const { Story } = defineMeta({
		title: 'Admin/AdminUnbanModal',
		component: AdminUnbanModal,
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
	name="Open"
	args={{
		isOpen: true
	}}
/>

<Story
	name="Closed"
	args={{
		isOpen: false
	}}
/>
