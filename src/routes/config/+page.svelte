<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import ConfigHeader from '$lib/components/config/ConfigHeader.svelte';
	import ConfigBotList from '$lib/components/config/ConfigBotList.svelte';
	import ConfigBotForm from '$lib/components/config/ConfigBotForm.svelte';
	import AdminAssistantList from '$lib/components/admin/AdminAssistantList.svelte';
	import AdminAssistantForm from '$lib/components/admin/AdminAssistantForm.svelte';
	import BottomNav from '$lib/components/lobby/BottomNav.svelte';
	import LobbyHeader from '$lib/components/lobby/LobbyHeader.svelte';
	import { invalidateAll } from '$app/navigation';

	let { data } = $props();

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
		active: boolean;
		created: string;
		updated: string;
	};

	let activeTab: Tab = $state('assistant');
	let showAssistantForm = $state(false);
	let editingAssistant: Assistant | null = $state(null);
	let showBotForm = $state(false);
	let editingBot: Bot | null = $state(null);

	async function saveAssistant(assistant: Omit<Assistant, 'id' | 'created' | 'updated'>) {
		const formData = new FormData();
		formData.set('name', assistant.name);
		formData.set('prompt', assistant.prompt);
		formData.set('active', String(assistant.active));

		if (editingAssistant) {
			formData.set('id', editingAssistant.id);
			await fetch('?/updateAssistant', { method: 'POST', body: formData });
		} else {
			await fetch('?/createAssistant', { method: 'POST', body: formData });
		}

		await invalidateAll();
		showAssistantForm = false;
		editingAssistant = null;
	}

	function editAssistant(assistant: Assistant) {
		editingAssistant = assistant;
		showAssistantForm = true;
	}

	async function deleteAssistant(assistantId: string) {
		const formData = new FormData();
		formData.set('id', assistantId);
		await fetch('?/deleteAssistant', { method: 'POST', body: formData });
		await invalidateAll();
	}

	function closeAssistantForm() {
		showAssistantForm = false;
		editingAssistant = null;
	}

	async function saveBot(bot: Omit<Bot, 'id' | 'created' | 'updated'>) {
		const formData = new FormData();
		formData.set('name', bot.name);
		formData.set('apiKey', bot.apiKey);
		formData.set('active', String(bot.active));

		if (editingBot) {
			formData.set('id', editingBot.id);
			await fetch('?/updateBot', { method: 'POST', body: formData });
		} else {
			await fetch('?/createBot', { method: 'POST', body: formData });
		}

		await invalidateAll();
		showBotForm = false;
		editingBot = null;
	}

	function editBot(bot: Bot) {
		editingBot = bot;
		showBotForm = true;
	}

	async function deleteBot(botId: string) {
		const formData = new FormData();
		formData.set('id', botId);
		await fetch('?/deleteBot', { method: 'POST', body: formData });
		await invalidateAll();
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
	<LobbyHeader username={data.username} avatarSrc={data.avatarSrc} isAdmin={data.isAdmin} />
	<ConfigHeader {activeTab} onchange={(tab) => (activeTab = tab)} />

	<main class="mx-auto w-full max-w-2xl flex-1 space-y-4 p-4 pb-24">
		{#if activeTab === 'assistant'}
			<div class="flex justify-end">
				<button
					class="comic-button inline-flex items-center gap-1 rounded-lg border-2 border-slate-900 bg-primary px-4 py-2 text-xs font-black text-white uppercase transition-colors hover:bg-primary/90"
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
				assistants={data.assistants}
				onedit={editAssistant}
				ondelete={deleteAssistant}
			/>
			{#if showAssistantForm}
				<AdminAssistantForm
					isOpen={showAssistantForm}
					{editingAssistant}
					onsave={saveAssistant}
					oncancel={closeAssistantForm}
				/>
			{/if}
		{:else if activeTab === 'bot'}
			<div class="flex justify-end">
				<button
					class="comic-button inline-flex items-center gap-1 rounded-lg border-2 border-slate-900 bg-primary px-4 py-2 text-xs font-black text-white uppercase transition-colors hover:bg-primary/90"
					onclick={() => {
						editingBot = null;
						showBotForm = true;
					}}
				>
					<span class="material-symbols-outlined text-sm">add</span>
					{m.config_add_bot()}
				</button>
			</div>
			<ConfigBotList bots={data.bots} onedit={editBot} ondelete={deleteBot} />
			{#if showBotForm}
				<ConfigBotForm isOpen={showBotForm} {editingBot} onsave={saveBot} oncancel={closeBotForm} />
			{/if}
		{/if}
	</main>

	<BottomNav active="config" />
</div>
