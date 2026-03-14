<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import ConfigPage from '../../../routes/config/+page.svelte';

	const mockAssistants = [
		{
			id: 'a1',
			name: 'Helpful Guide',
			prompt: '당신은 게임을 설명해주고 도움을 주는 AI 어시스턴트입니다.',
			active: true,
			created: '2025-03-01',
			updated: '2025-03-08'
		},
		{
			id: 'a2',
			name: 'Challenger',
			prompt: '당신은 도전적인 태도로 플레이어들에게 자극을 주는 AI입니다.',
			active: false,
			created: '2025-03-05',
			updated: '2025-03-07'
		}
	];

	const mockBots = [
		{
			id: 'b1',
			name: 'Discord Bot',
			apiKey: 'MTk4NjIyNDgzNDU5Mjk1MDcy...',
			active: true,
			created: '2025-02-15',
			updated: '2025-03-08'
		}
	];

	const { Story } = defineMeta({
		title: 'Pages/ConfigPage',
		component: ConfigPage,
		tags: ['autodocs'],
		parameters: {
			layout: 'fullscreen'
		}
	});
</script>

<Story name="Assistant Tab" asChild>
	<ConfigPage
		data={{ bots: mockBots, userId: '', username: 'Admin', avatarSrc: '', isAdmin: false }}
	/>
</Story>

<Story name="Bot Tab" asChild>
	<ConfigPage
		data={{ bots: mockBots, userId: '', username: 'Admin', avatarSrc: '', isAdmin: false }}
	/>
</Story>

<Story name="Empty State" asChild>
	<ConfigPage data={{ bots: [], userId: '', username: 'Admin', avatarSrc: '', isAdmin: false }} />
</Story>
