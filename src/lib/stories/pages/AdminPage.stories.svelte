<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import AdminPage from '../../../routes/admin/+page.svelte';

	const mockUsers = [
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
			name: 'Doc_Holiday',
			email: 'doc@shot.com',
			games: 67,
			joined: '2025-02-20',
			banned: false
		},
		{
			id: 'u4',
			name: 'Calamity_Sue',
			email: 'sue@shot.com',
			games: 12,
			joined: '2025-03-01',
			banned: true
		},
		{
			id: 'u5',
			name: 'Whiskey_Pete',
			email: 'pete@shot.com',
			games: 44,
			joined: '2025-03-05',
			banned: false
		}
	];

	const mockRooms = [
		{
			id: 'r1',
			name: 'Wild West Duel',
			host: 'Sheriff_Buck',
			currentPlayers: 3,
			maxPlayers: 4,
			status: 'waiting'
		},
		{
			id: 'r2',
			name: 'Gold Rush Heist',
			host: 'Outlaw_Jane',
			currentPlayers: 4,
			maxPlayers: 4,
			status: 'in_progress'
		},
		{
			id: 'r3',
			name: 'Saloon Brawl',
			host: 'Whiskey_Pete',
			currentPlayers: 2,
			maxPlayers: 8,
			status: 'waiting'
		}
	];

	const mockAssistants = [
		{
			id: 'a1',
			name: 'Sheriff',
			prompt:
				'당신은 서부 영화의 보안관처럼 행동하는 AI입니다. 공정하고 정의감 있으며, 항상 플레이어들의 안전을 먼저 생각합니다.',
			active: true,
			created: '2025-02-01',
			updated: '2025-03-08'
		},
		{
			id: 'a2',
			name: 'Saloon Keeper',
			prompt:
				'당신은 오래된 술집의 주인입니다. 사교적이고 말을 잘 들으며, 게임에 대한 흥미로운 이야기와 조언을 해줍니다.',
			active: true,
			created: '2025-02-15',
			updated: '2025-03-05'
		},
		{
			id: 'a3',
			name: 'Outlaw',
			prompt:
				'당신은 대담하고 모험적인 악당입니다. 재치 있고 약간 위협적이지만 나쁜 의도는 없습니다.',
			active: false,
			created: '2025-02-20',
			updated: '2025-02-28'
		}
	];

	const mockLLMProviders = [
		{
			id: 'p1',
			name: 'Anthropic',
			baseUrl: 'https://api.anthropic.com',
			apiKey: '••••••••••••',
			active: true
		},
		{
			id: 'p2',
			name: 'OpenAI',
			baseUrl: 'https://api.openai.com',
			apiKey: '••••••••••••',
			active: true
		},
		{
			id: 'p3',
			name: 'Gemini',
			baseUrl: 'https://generativelanguage.googleapis.com',
			apiKey: '••••••••••••',
			active: false
		}
	];

	const mockLLMModels = [
		{
			id: 'm1',
			providerId: 'p1',
			name: 'Claude 3.5 Sonnet',
			contextWindow: 200000,
			costInput: 0.003,
			costOutput: 0.015,
			enabled: true
		},
		{
			id: 'm2',
			providerId: 'p1',
			name: 'Claude 3 Opus',
			contextWindow: 200000,
			costInput: 0.015,
			costOutput: 0.075,
			enabled: true
		},
		{
			id: 'm3',
			providerId: 'p2',
			name: 'GPT-4 Turbo',
			contextWindow: 128000,
			costInput: 0.01,
			costOutput: 0.03,
			enabled: false
		},
		{
			id: 'm4',
			providerId: 'p2',
			name: 'GPT-4o',
			contextWindow: 128000,
			costInput: 0.005,
			costOutput: 0.015,
			enabled: true
		}
	];

	const { Story } = defineMeta({
		title: 'Pages/Admin',
		component: AdminPage,
		parameters: {
			layout: 'fullscreen'
		}
	});
</script>

<Story name="Dashboard" asChild>
	<AdminPage
		data={{
			users: mockUsers,
			rooms: mockRooms,
			assistants: mockAssistants,
			llmProviders: mockLLMProviders,
			llmModels: mockLLMModels
		}}
	/>
</Story>

<Story name="Empty State" asChild>
	<AdminPage
		data={{
			users: [],
			rooms: [],
			assistants: [],
			llmProviders: [],
			llmModels: []
		}}
	/>
</Story>
