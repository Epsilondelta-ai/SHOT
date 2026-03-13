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
	import AddButton from '$lib/components/common/AddButton.svelte';
	import ConfirmModal from '$lib/components/common/ConfirmModal.svelte';
	import { apiPost, apiPut, apiDelete } from '$lib/api';

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

	let activeTab: Tab = $state(data.isAdmin ? 'assistant' : 'bot');
	let showAssistantForm = $state(false);
	let editingAssistant: Assistant | null = $state(null);
	let showBotForm = $state(false);
	let editingBot: Bot | null = $state(null);
	let showConfirmModal = $state(false);
	let confirmCallback = $state<(() => void) | null>(null);

	function openConfirm(callback: () => void) {
		confirmCallback = callback;
		showConfirmModal = true;
	}

	function handleConfirm() {
		confirmCallback?.();
		showConfirmModal = false;
		confirmCallback = null;
	}

	function handleCancelConfirm() {
		showConfirmModal = false;
		confirmCallback = null;
	}

	async function saveAssistant(assistant: Omit<Assistant, 'id' | 'created' | 'updated'>) {
		if (editingAssistant) {
			await apiPut(`/api/config/assistants/${editingAssistant.id}`, assistant);
		} else {
			await apiPost('/api/config/assistants', assistant);
		}

		await invalidateAll();
		showAssistantForm = false;
		editingAssistant = null;
	}

	function editAssistant(assistant: Assistant) {
		editingAssistant = assistant;
		showAssistantForm = true;
	}

	function deleteAssistant(assistantId: string) {
		openConfirm(async () => {
			await apiDelete(`/api/config/assistants/${assistantId}`);
			await invalidateAll();
		});
	}

	function closeAssistantForm() {
		showAssistantForm = false;
		editingAssistant = null;
	}

	async function saveBot(bot: Omit<Bot, 'id' | 'created' | 'updated'>) {
		if (editingBot) {
			await apiPut(`/api/config/bots/${editingBot.id}`, bot);
		} else {
			await apiPost('/api/config/bots', bot);
		}

		await invalidateAll();
		showBotForm = false;
		editingBot = null;
	}

	function editBot(bot: Bot) {
		editingBot = bot;
		showBotForm = true;
	}

	function deleteBot(botId: string) {
		openConfirm(async () => {
			await apiDelete(`/api/config/bots/${botId}`);
			await invalidateAll();
		});
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
	<ConfigHeader {activeTab} onchange={(tab) => (activeTab = tab)} isAdmin={data.isAdmin} />

	<main class="mx-auto w-full max-w-2xl flex-1 space-y-4 p-4 pb-24">
		{#if activeTab === 'assistant'}
			<div class="flex justify-end">
				<AddButton
					label={m.config_add_assistant()}
					onclick={() => {
						editingAssistant = null;
						showAssistantForm = true;
					}}
				/>
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
				<AddButton
					label={m.config_add_bot()}
					onclick={() => {
						editingBot = null;
						showBotForm = true;
					}}
				/>
			</div>
			<ConfigBotList bots={data.bots} onedit={editBot} ondelete={deleteBot} />
			{#if showBotForm}
				<ConfigBotForm isOpen={showBotForm} {editingBot} onsave={saveBot} oncancel={closeBotForm} />
			{/if}
		{/if}
	</main>

	<BottomNav active="config" />
</div>

<ConfirmModal isOpen={showConfirmModal} onconfirm={handleConfirm} oncancel={handleCancelConfirm} />
