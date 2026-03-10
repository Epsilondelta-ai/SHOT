<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import AdminBanHistoryModal from './AdminBanHistoryModal.svelte';
	import { fn } from 'storybook/test';

	const { Story } = defineMeta({
		title: 'Admin/AdminBanHistoryModal',
		component: AdminBanHistoryModal,
		tags: ['autodocs'],
		parameters: {
			layout: 'centered'
		},
		args: {
			onclose: fn()
		}
	});
</script>

<Story
	name="Open"
	args={{
		isOpen: true,
		userName: '홍길동',
		userId: 'user-123'
	}}
/>

<Story
	name="Closed"
	args={{
		isOpen: false,
		userName: '홍길동',
		userId: 'user-123'
	}}
/>
