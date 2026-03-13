<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import ConfigHeader from '$lib/components/config/ConfigHeader.svelte';
	import ConfigBotList from '$lib/components/config/ConfigBotList.svelte';
	import ConfigBotForm from '$lib/components/config/ConfigBotForm.svelte';
	import BottomNav from '$lib/components/lobby/BottomNav.svelte';
	import LobbyHeader from '$lib/components/lobby/LobbyHeader.svelte';
	import { invalidateAll } from '$app/navigation';
	import AddButton from '$lib/components/common/AddButton.svelte';
	import ConfirmModal from '$lib/components/common/ConfirmModal.svelte';
	import { apiPost, apiPut, apiDelete } from '$lib/api';

	let { data } = $props();

	type Tab = 'bot';

	type Bot = {
		id: string;
		name: string;
		active: boolean;
		pairingStatus: 'unpaired' | 'pairing' | 'paired' | 'error';
		presenceStatus: 'online' | 'offline';
		created: string | null;
		updated: string | null;
		lastSeenAt: string | null;
		pairingCodeExpiresAt: string | null;
		connectorName: string | null;
		connectorVersion?: string | null;
		deviceId?: string | null;
		busy?: boolean;
	};

	let activeTab: Tab = $state('bot');
	let showBotForm = $state(false);
	let editingBot: Bot | null = $state(null);
	let pairingCodes = $state<Record<string, { code: string; expiresAt: string } | undefined>>({});
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

<<<<<<< HEAD
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

	async function saveBot(bot: { name: string; active: boolean }) {
=======
	async function saveBot(bot: Omit<Bot, 'id' | 'created' | 'updated'>) {
>>>>>>> origin/dev
		if (editingBot) {
			await apiPut(`/api/bots/${editingBot.id}`, bot);
		} else {
			await apiPost('/api/bots', bot);
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
			await apiDelete(`/api/bots/${botId}`);
			await invalidateAll();
		});
	}

	async function startPairing(botId: string) {
		const result = await apiPost<{ pairingCode: string; expiresAt: string }>(
			`/api/bots/${botId}/pair/start`
		);
		pairingCodes = {
			...pairingCodes,
			[botId]: { code: result.pairingCode, expiresAt: result.expiresAt }
		};
		await invalidateAll();
	}

	async function cancelPairing(botId: string) {
		await apiPost(`/api/bots/${botId}/pair/cancel`);
		pairingCodes = {
			...pairingCodes,
			[botId]: undefined
		};
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
		<div class="flex justify-end">
			<AddButton
				label={m.config_add_bot()}
				onclick={() => {
					editingBot = null;
					showBotForm = true;
				}}
			/>
<<<<<<< HEAD
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
			<ConfigBotList
				bots={data.bots}
				{pairingCodes}
				onedit={editBot}
				ondelete={deleteBot}
				onpairstart={startPairing}
				onpaircancel={cancelPairing}
			/>
			{#if showBotForm}
				<ConfigBotForm isOpen={showBotForm} {editingBot} onsave={saveBot} oncancel={closeBotForm} />
			{/if}
=======
		</div>
		<ConfigBotList bots={data.bots} onedit={editBot} ondelete={deleteBot} />
		{#if showBotForm}
			<ConfigBotForm isOpen={showBotForm} {editingBot} onsave={saveBot} oncancel={closeBotForm} />
>>>>>>> origin/dev
		{/if}
	</main>

	<BottomNav active="config" />
</div>

<ConfirmModal isOpen={showConfirmModal} onconfirm={handleConfirm} oncancel={handleCancelConfirm} />
