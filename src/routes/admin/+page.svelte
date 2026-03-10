<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import AdminHeader from '$lib/components/admin/AdminHeader.svelte';
	import AdminStats from '$lib/components/admin/AdminStats.svelte';
	import AdminUserList from '$lib/components/admin/AdminUserList.svelte';
	import AdminRoomList from '$lib/components/admin/AdminRoomList.svelte';
	import AdminLLMConfig from '$lib/components/admin/AdminLLMConfig.svelte';
	import AdminAssistantList from '$lib/components/admin/AdminAssistantList.svelte';
	import AdminAssistantForm from '$lib/components/admin/AdminAssistantForm.svelte';

	type Tab = 'dashboard' | 'users' | 'rooms' | 'llm' | 'assistant';

	type LLMProvider = {
		id: string;
		name: string;
		baseUrl: string;
		apiKey: string;
		active: boolean;
	};

	type LLMModel = {
		id: string;
		providerId: string;
		name: string;
		contextWindow: number;
		costInput: number;
		costOutput: number;
		enabled: boolean;
	};

	type Assistant = {
		id: string;
		name: string;
		prompt: string;
		active: boolean;
		created: string;
		updated: string;
	};

	let activeTab: Tab = $state('dashboard');
	let showAssistantForm = $state(false);
	let editingAssistant: Assistant | null = $state(null);

	// Mock data
	let llmProviders: LLMProvider[] = $state([
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
	]);

	let llmModels: LLMModel[] = $state([
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
	]);

	let users = $state([
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
	]);

	let rooms = $state([
		{
			id: 'r1',
			name: 'Wild West Duel',
			host: 'Sheriff_Buck',
			currentPlayers: 3,
			maxPlayers: 4,
			status: 'waiting' as const
		},
		{
			id: 'r2',
			name: 'Gold Rush Heist',
			host: 'Outlaw_Jane',
			currentPlayers: 4,
			maxPlayers: 4,
			status: 'in_progress' as const
		},
		{
			id: 'r3',
			name: 'Saloon Brawl',
			host: 'Whiskey_Pete',
			currentPlayers: 2,
			maxPlayers: 8,
			status: 'waiting' as const
		}
	]);

	let assistants = $state<Assistant[]>([
		{
			id: 'a1',
			name: 'Sheriff',
			prompt:
				'당신은 서부 영화의 보안관처럼 행동하는 AI입니다. 공정하고 정의감 있으며, 항상 플레이어들의 안전을 먼저 생각합니다. 따뜻한 미국 남부 억양으로 말하세요.',
			active: true,
			created: '2025-02-01',
			updated: '2025-03-08'
		},
		{
			id: 'a2',
			name: 'Saloon Keeper',
			prompt:
				'당신은 오래된 술집의 주인입니다. 사교적이고 말을 잘 들으며, 게임에 대한 흥미로운 이야기와 조언을 해줍니다. 따뜻하고 포용적인 성격을 보여주세요.',
			active: true,
			created: '2025-02-15',
			updated: '2025-03-05'
		},
		{
			id: 'a3',
			name: 'Outlaw',
			prompt:
				'당신은 대담하고 모험적인 악당입니다. 재치 있고 약간 위협적이지만 나쁜 의도는 없습니다. 플레이어들에게 도전적인 질문을 던지고 재미있는 상황을 만드세요.',
			active: false,
			created: '2025-02-20',
			updated: '2025-02-28'
		}
	]);

	function banUser(userId: string) {
		users = users.map((u) => (u.id === userId ? { ...u, banned: true } : u));
	}

	function unbanUser(userId: string) {
		users = users.map((u) => (u.id === userId ? { ...u, banned: false } : u));
	}

	function closeRoom(roomId: string) {
		rooms = rooms.filter((r) => r.id !== roomId);
	}

	function addLLMProvider(provider: Omit<LLMProvider, 'id'>) {
		llmProviders = [...llmProviders, { id: crypto.randomUUID(), ...provider }];
	}

	function deleteLLMProvider(providerId: string) {
		llmProviders = llmProviders.filter((p) => p.id !== providerId);
		llmModels = llmModels.filter((m) => m.providerId !== providerId);
	}

	function testLLMModel(_modelId: string) {
		// TODO: implement model testing
	}

	function addLLMModel(model: Omit<LLMModel, 'id'>) {
		llmModels = [...llmModels, { id: crypto.randomUUID(), ...model }];
	}

	function deleteLLMModel(modelId: string) {
		llmModels = llmModels.filter((m) => m.id !== modelId);
	}

	function addAssistant(assistant: Omit<Assistant, 'id' | 'created' | 'updated'>) {
		const now = new Date().toISOString().split('T')[0];
		assistants = [
			...assistants,
			{
				id: crypto.randomUUID(),
				...assistant,
				created: now,
				updated: now
			}
		];
		showAssistantForm = false;
		editingAssistant = null;
	}

	function editAssistant(assistant: Assistant) {
		editingAssistant = assistant;
		showAssistantForm = true;
	}

	function saveAssistant(assistant: Omit<Assistant, 'id' | 'created' | 'updated'>) {
		if (editingAssistant) {
			const now = new Date().toISOString().split('T')[0];
			assistants = assistants.map((a) =>
				a.id === editingAssistant!.id
					? {
							...a,
							...assistant,
							updated: now
						}
					: a
			);
		} else {
			addAssistant(assistant);
		}
		showAssistantForm = false;
		editingAssistant = null;
	}

	function deleteAssistant(assistantId: string) {
		assistants = assistants.filter((a) => a.id !== assistantId);
	}

	function closeAssistantForm() {
		showAssistantForm = false;
		editingAssistant = null;
	}
</script>

<svelte:head>
	<title>{m.admin_title()}</title>
</svelte:head>

<div class="flex min-h-screen flex-col bg-background-light font-display text-slate-900">
	<AdminHeader {activeTab} onchange={(tab) => (activeTab = tab)} />

	<main class="mx-auto w-full max-w-2xl flex-1 space-y-4 p-4 pb-8">
		{#if activeTab === 'dashboard'}
			<AdminStats
				totalUsers={users.length}
				activeNow={users.filter((u) => !u.banned).length}
				activeRooms={rooms.length}
				gamesToday={23}
			/>

			<!-- Quick overview sections -->
			<section>
				<h2
					class="mb-3 flex items-center gap-2 text-sm font-black tracking-widest text-slate-500 uppercase"
				>
					<span class="material-symbols-outlined text-primary">group</span>
					{m.admin_users()}
				</h2>
				<AdminUserList {users} onban={banUser} onunban={unbanUser} />
			</section>

			<section>
				<h2
					class="mb-3 flex items-center gap-2 text-sm font-black tracking-widest text-slate-500 uppercase"
				>
					<span class="material-symbols-outlined text-primary">meeting_room</span>
					{m.admin_rooms()}
				</h2>
				<AdminRoomList {rooms} onclose={closeRoom} />
			</section>
		{:else if activeTab === 'users'}
			<h2
				class="flex items-center gap-2 text-sm font-black tracking-widest text-slate-500 uppercase"
			>
				<span class="material-symbols-outlined text-primary">group</span>
				{m.admin_users()}
			</h2>
			<AdminUserList {users} onban={banUser} onunban={unbanUser} />
		{:else if activeTab === 'rooms'}
			<h2
				class="flex items-center gap-2 text-sm font-black tracking-widest text-slate-500 uppercase"
			>
				<span class="material-symbols-outlined text-primary">meeting_room</span>
				{m.admin_rooms()}
			</h2>
			<AdminRoomList {rooms} onclose={closeRoom} />
		{:else if activeTab === 'llm'}
			<h2
				class="flex items-center gap-2 text-sm font-black tracking-widest text-slate-500 uppercase"
			>
				<span class="material-symbols-outlined text-primary">smart_toy</span>
				{m.admin_llm()}
			</h2>
			<AdminLLMConfig
				providers={llmProviders}
				models={llmModels}
				onprovideradd={addLLMProvider}
				onproviderdelete={deleteLLMProvider}
				onmodeltest={testLLMModel}
				onmodeladd={addLLMModel}
				onmodeldelete={deleteLLMModel}
			/>
		{:else if activeTab === 'assistant'}
			<div class="flex items-center justify-between">
				<h2
					class="flex items-center gap-2 text-sm font-black tracking-widest text-slate-500 uppercase"
				>
					<span class="material-symbols-outlined text-primary">psychology</span>
					{m.admin_assistant()}
				</h2>
				<button
					class="comic-button rounded-lg border-2 border-slate-900 bg-primary px-4 py-2 text-xs font-black text-white uppercase transition-colors hover:bg-primary/90"
					onclick={() => {
						editingAssistant = null;
						showAssistantForm = true;
					}}
				>
					<span class="material-symbols-outlined text-sm">add</span>
					{m.admin_add_assistant()}
				</button>
			</div>
			<AdminAssistantList {assistants} onedit={editAssistant} ondelete={deleteAssistant} />
			{#if showAssistantForm}
				<AdminAssistantForm
					isOpen={showAssistantForm}
					{editingAssistant}
					onsave={saveAssistant}
					oncancel={closeAssistantForm}
				/>
			{/if}
		{/if}
	</main>
</div>
