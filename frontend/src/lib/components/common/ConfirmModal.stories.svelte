<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import ConfirmModal from './ConfirmModal.svelte';
	import { fn } from 'storybook/test';

	const { Story } = defineMeta({
		title: 'Common/ConfirmModal',
		component: ConfirmModal,
		tags: ['autodocs'],
		parameters: {
			layout: 'centered'
		},
		args: {
			onconfirm: fn(),
			oncancel: fn()
		}
	});
</script>

<Story
	name="Open"
	args={{
		isOpen: true,
		message: '삭제 하시겠습니까?'
	}}
/>

<Story
	name="Custom Message"
	args={{
		isOpen: true,
		message: '정말로 이 항목을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.'
	}}
/>

<Story
	name="Closed"
	args={{
		isOpen: false,
		message: '삭제 하시겠습니까?'
	}}
/>
