<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import AdminAssistantForm from './AdminAssistantForm.svelte';
	import { fn } from 'storybook/test';

	const { Story } = defineMeta({
		title: 'Admin/AdminAssistantForm',
		component: AdminAssistantForm,
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
		editingAssistant: null
	}}
/>

<Story
	name="Edit Existing"
	args={{
		isOpen: true,
		editingAssistant: {
			id: 'a1',
			name: 'Sheriff',
			prompt: '당신은 서부 영화의 보안관처럼 행동하는 AI입니다. 공정하고 정의감 있으며, 항상 플레이어들의 안전을 먼저 생각합니다. 따뜻한 미국 남부 억양으로 말하세요.',
			active: true,
			created: '2025-02-01',
			updated: '2025-03-08'
		}
	}}
/>

<Story
	name="Closed"
	args={{
		isOpen: false,
		editingAssistant: null
	}}
/>
