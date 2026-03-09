<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import AdminAssistantList from './AdminAssistantList.svelte';
	import { fn } from 'storybook/test';

	const { Story } = defineMeta({
		title: 'Admin/AdminAssistantList',
		component: AdminAssistantList,
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
		assistants: [
			{
				id: 'a1',
				name: 'Sheriff',
				prompt: '당신은 서부 영화의 보안관처럼 행동하는 AI입니다. 공정하고 정의감 있으며, 항상 플레이어들의 안전을 먼저 생각합니다.',
				active: true,
				created: '2025-02-01',
				updated: '2025-03-08'
			},
			{
				id: 'a2',
				name: 'Saloon Keeper',
				prompt: '당신은 오래된 술집의 주인입니다. 사교적이고 말을 잘 들으며, 게임에 대한 흥미로운 이야기와 조언을 해줍니다.',
				active: true,
				created: '2025-02-15',
				updated: '2025-03-05'
			},
			{
				id: 'a3',
				name: 'Outlaw',
				prompt: '당신은 대담하고 모험적인 악당입니다. 재치 있고 약간 위협적이지만 나쁜 의도는 없습니다.',
				active: false,
				created: '2025-02-20',
				updated: '2025-02-28'
			}
		]
	}}
/>

<Story
	name="Single Active Assistant"
	args={{
		assistants: [
			{
				id: 'a1',
				name: 'Friendly Guide',
				prompt: 'You are a friendly guide who helps players understand the game rules.',
				active: true,
				created: '2025-03-01',
				updated: '2025-03-08'
			}
		]
	}}
/>

<Story
	name="All Inactive"
	args={{
		assistants: [
			{
				id: 'a1',
				name: 'Old Sheriff',
				prompt: 'An experienced sheriff who tells stories of the past.',
				active: false,
				created: '2025-02-01',
				updated: '2025-02-20'
			},
			{
				id: 'a2',
				name: 'Retired Prospector',
				prompt: 'A retired gold prospector with wisdom to share.',
				active: false,
				created: '2025-02-10',
				updated: '2025-02-25'
			}
		]
	}}
/>

<Story
	name="Empty"
	args={{
		assistants: []
	}}
/>
