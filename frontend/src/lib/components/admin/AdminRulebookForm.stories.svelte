<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import AdminRulebookForm from './AdminRulebookForm.svelte';
	import { fn } from 'storybook/test';

	const { Story } = defineMeta({
		title: 'Admin/AdminRulebookForm',
		component: AdminRulebookForm,
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
		editingRulebook: null
	}}
/>

<Story
	name="Edit Existing"
	args={{
		isOpen: true,
		editingRulebook: {
			id: 'r1',
			name: '기본 룰북',
			content: '플레이어는 매 턴마다 카드를 사용할 수 있습니다.\n스파이는 정체를 숨기고 요원들을 공격해야 합니다.\n리더는 팀의 승리를 위해 전략적으로 행동해야 합니다.',
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
		editingRulebook: null
	}}
/>
