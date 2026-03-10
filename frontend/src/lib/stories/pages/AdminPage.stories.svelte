<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import AdminPage from '../../../routes/admin/+page.svelte';

	const mockUsers = [
		{
			id: 'u1',
			name: 'Sheriff_Buck',
			email: 'buck@shot.com',
			role: 'admin',
			games: 128,
			joined: '2025-01-15',
			banned: false,
			banEnd: null,
			banReason: null,
			banHistoryCount: 0,
			online: true
		},
		{
			id: 'u2',
			name: 'Outlaw_Jane',
			email: 'jane@shot.com',
			role: 'user',
			games: 95,
			joined: '2025-02-03',
			banned: false,
			banEnd: null,
			banReason: null,
			banHistoryCount: 0,
			online: false
		},
		{
			id: 'u3',
			name: 'Doc_Holiday',
			email: 'doc@shot.com',
			role: 'user',
			games: 67,
			joined: '2025-02-20',
			banned: false,
			banEnd: null,
			banReason: null,
			banHistoryCount: 1,
			online: false
		},
		{
			id: 'u4',
			name: 'Calamity_Sue',
			email: 'sue@shot.com',
			role: 'user',
			games: 12,
			joined: '2025-03-01',
			banned: true,
			banEnd: '2025-04-01',
			banReason: 'Toxic behavior',
			banHistoryCount: 2,
			online: false
		},
		{
			id: 'u5',
			name: 'Whiskey_Pete',
			email: 'pete@shot.com',
			role: 'user',
			games: 44,
			joined: '2025-03-05',
			banned: false,
			banEnd: null,
			banReason: null,
			banHistoryCount: 0,
			online: true
		}
	];

	type RoomStatus = 'waiting' | 'full' | 'starting_soon' | 'in_progress';
	const mockRooms: { id: string; name: string; host: string; currentPlayers: number; maxPlayers: number; status: RoomStatus }[] = [
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
		{ provider: 'anthropic' as const, apiKey: '••••••••••••', active: true },
		{ provider: 'openai' as const, apiKey: '••••••••••••', active: true },
		{ provider: 'google' as const, apiKey: '••••••••••••', active: false },
		{ provider: 'xai' as const, apiKey: '', active: false }
	];

	const mockLLMModels = [
		{
			id: 'm1',
			provider: 'anthropic' as const,
			apiModelName: 'claude-3-5-sonnet-20241022',
			displayName: 'Claude 3.5 Sonnet',
			active: true
		},
		{
			id: 'm2',
			provider: 'anthropic' as const,
			apiModelName: 'claude-3-opus-20240229',
			displayName: 'Claude 3 Opus',
			active: true
		},
		{
			id: 'm3',
			provider: 'openai' as const,
			apiModelName: 'gpt-4-turbo',
			displayName: 'GPT-4 Turbo',
			active: false
		},
		{
			id: 'm4',
			provider: 'openai' as const,
			apiModelName: 'gpt-4o',
			displayName: 'GPT-4o',
			active: true
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
