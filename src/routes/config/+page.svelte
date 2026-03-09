<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import ConfigHeader from '$lib/components/config/ConfigHeader.svelte';
	import ConfigBotList from '$lib/components/config/ConfigBotList.svelte';
	import ConfigBotForm from '$lib/components/config/ConfigBotForm.svelte';
	import AdminAssistantList from '$lib/components/admin/AdminAssistantList.svelte';
	import AdminAssistantForm from '$lib/components/admin/AdminAssistantForm.svelte';
	import BottomNav from '$lib/components/lobby/BottomNav.svelte';

	type Tab = 'assistant' | 'bot';

	type Assistant = {
		id: string;
		name: string;
		prompt: string;
		active: boolean;
		created: string;
		updated: string;
	};

	type Bot = {
		id: string;
		name: string;
		apiKey: string;
		webhookUrl: string;
		active: boolean;
		created: string;
		updated: string;
	};

	let activeTab: Tab = $state('assistant');
	let showAssistantForm = $state(false);
	let editingAssistant: Assistant | null = $state(null);
	let showBotForm = $state(false);
	let editingBot: Bot | null = $state(null);

	// Mock data
	let assistants = $state<Assistant[]>([
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
	]);

	let bots = $state<Bot[]>([
		{
			id: 'b1',
			name: 'Discord Bot',
			apiKey: 'MTk4NjIyNDgzNDU5Mjk1MDcy...',
			webhookUrl: 'https://discord.com/api/webhooks/...',
			active: true,
			created: '2025-02-15',
			updated: '2025-03-08'
		}
	]);

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

	function addBot(bot: Omit<Bot, 'id' | 'created' | 'updated'>) {
		const now = new Date().toISOString().split('T')[0];
		bots = [
			...bots,
			{
				id: crypto.randomUUID(),
				...bot,
				created: now,
				updated: now
			}
		];
		showBotForm = false;
		editingBot = null;
	}

	function editBot(bot: Bot) {
		editingBot = bot;
		showBotForm = true;
	}

	function saveBot(bot: Omit<Bot, 'id' | 'created' | 'updated'>) {
		if (editingBot) {
			const now = new Date().toISOString().split('T')[0];
			bots = bots.map((b) =>
				b.id === editingBot!.id
					? {
							...b,
							...bot,
							updated: now
						}
					: b
			);
		} else {
			addBot(bot);
		}
		showBotForm = false;
		editingBot = null;
	}

	function deleteBot(botId: string) {
		bots = bots.filter((b) => b.id !== botId);
	}

	function closeBotForm() {
		showBotForm = false;
		editingBot = null;
	}
</script>

<svelte:head>
	<title>{m.config_title()}</title>
</svelte:head>

<div class="flex min-h-screen flex-col bg-background-light font-display text-slate-900">
	<ConfigHeader {activeTab} onchange={(tab) => (activeTab = tab)} />

	<main class="mx-auto w-full max-w-2xl flex-1 space-y-4 p-4 pb-24">
		{#if activeTab === 'assistant'}
			<div class="flex items-center justify-between">
				<h2 class="flex items-center gap-2 text-sm font-black tracking-widest text-slate-500 uppercase">
					<span class="material-symbols-outlined text-primary">psychology</span>
					{m.config_tab_assistant()}
				</h2>
				<button
					class="comic-button rounded-lg border-2 border-slate-900 bg-primary px-4 py-2 text-xs font-black text-white uppercase transition-colors hover:bg-primary/90"
					onclick={() => {
						editingAssistant = null;
						showAssistantForm = true;
					}}
				>
					<span class="material-symbols-outlined text-sm">add</span>
					{m.config_add_assistant()}
				</button>
			</div>
			<AdminAssistantList
				{assistants}
				onedit={editAssistant}
				ondelete={deleteAssistant}
			/>
			{#if showAssistantForm}
				<AdminAssistantForm
					isOpen={showAssistantForm}
					editingAssistant={editingAssistant}
					onsave={saveAssistant}
					oncancel={closeAssistantForm}
				/>
			{/if}
		{:else if activeTab === 'bot'}
			<div class="flex items-center justify-between">
				<h2 class="flex items-center gap-2 text-sm font-black tracking-widest text-slate-500 uppercase">
					<span class="material-symbols-outlined text-primary">smart_toy</span>
					{m.config_tab_bot()}
				</h2>
				<button
					class="comic-button rounded-lg border-2 border-slate-900 bg-primary px-4 py-2 text-xs font-black text-white uppercase transition-colors hover:bg-primary/90"
					onclick={() => {
						editingBot = null;
						showBotForm = true;
					}}
				>
					<span class="material-symbols-outlined text-sm">add</span>
					{m.config_add_bot()}
				</button>
			</div>
			<ConfigBotList
				{bots}
				onedit={editBot}
				ondelete={deleteBot}
			/>
			{#if showBotForm}
				<ConfigBotForm
					isOpen={showBotForm}
					editingBot={editingBot}
					onsave={saveBot}
					oncancel={closeBotForm}
				/>
			{/if}
		{/if}
	</main>

	<BottomNav active="config" />
</div>
