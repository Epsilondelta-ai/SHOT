<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import AdminRulebookList from './AdminRulebookList.svelte';
	import { fn } from 'storybook/test';

	const { Story } = defineMeta({
		title: 'Admin/AdminRulebookList',
		component: AdminRulebookList,
		tags: ['autodocs'],
		parameters: {
			layout: 'centered'
		},
		args: {
			onedit: fn(),
			ondelete: fn()
		}
	});
</script>

<Story
	name="With Rulebooks"
	args={{
		rulebooks: [
			{
				id: 'r1',
				name: '기본 룰북',
				content: '플레이어는 매 턴마다 카드를 사용할 수 있습니다.\n스파이는 정체를 숨기고 요원들을 공격해야 합니다.',
				active: true,
				created: '2025-02-01',
				updated: '2025-03-08'
			},
			{
				id: 'r2',
				name: '고급 룰북',
				content: '고급 전략 가이드입니다. 카드 조합과 팀 전략에 대한 심화 규칙을 포함합니다.',
				active: false,
				created: '2025-01-15',
				updated: '2025-02-20'
			}
		]
	}}
/>

<Story
	name="Empty"
	args={{
		rulebooks: []
	}}
/>
