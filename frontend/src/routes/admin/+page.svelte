<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import AdminHeader from '$lib/components/admin/AdminHeader.svelte';
	import AdminStats from '$lib/components/admin/AdminStats.svelte';
	import AdminUserList from '$lib/components/admin/AdminUserList.svelte';
	import AdminRoomList from '$lib/components/admin/AdminRoomList.svelte';
	import AdminLLMConfig from '$lib/components/admin/AdminLLMConfig.svelte';
	import AdminAssistantList from '$lib/components/admin/AdminAssistantList.svelte';
	import AdminAssistantForm from '$lib/components/admin/AdminAssistantForm.svelte';
	import AdminRulebookList from '$lib/components/admin/AdminRulebookList.svelte';
	import AdminRulebookForm from '$lib/components/admin/AdminRulebookForm.svelte';
	import AdminBanModal from '$lib/components/admin/AdminBanModal.svelte';
	import AdminUnbanModal from '$lib/components/admin/AdminUnbanModal.svelte';
	import AdminBanHistoryModal from '$lib/components/admin/AdminBanHistoryModal.svelte';
	import { invalidateAll } from '$app/navigation';
	import AddButton from '$lib/components/common/AddButton.svelte';
	import ConfirmModal from '$lib/components/common/ConfirmModal.svelte';
	import { apiPost, apiPut, apiDelete } from '$lib/api';

	let { data } = $props();

	type Tab = 'dashboard' | 'users' | 'rooms' | 'llm' | 'assistant' | 'rulebook';

	type Assistant = {
		id: string;
		name: string;
		prompt: string;
		active: boolean;
		created: string;
		updated: string;
	};

	type Rulebook = {
		id: string;
		name: string;
		content: string;
		active: boolean;
		created: string;
		updated: string;
	};

	let activeTab: Tab = $state('dashboard');
	let showAssistantForm = $state(false);
	let editingAssistant: Assistant | null = $state(null);
	let showRulebookForm = $state(false);
	let editingRulebook: Rulebook | null = $state(null);
	let showBanModal = $state(false);
	let banningUserId = $state('');
	let showUnbanModal = $state(false);
	let unbanningUserId = $state('');
	let showHistoryModal = $state(false);
	let historyUserId = $state('');
	let historyUserName = $state('');
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

	const llmProviders = $derived(data.llmProviders);
	const llmModels = $derived(data.llmModels);

	async function saveLlmApiKey(
		provider: 'anthropic' | 'openai' | 'google' | 'xai',
		apiKey: string
	) {
		await apiPost('/api/admin/llm-providers/save-key', { provider, apiKey });
		await invalidateAll();
	}

	async function toggleLlmProvider(
		provider: 'anthropic' | 'openai' | 'google' | 'xai',
		active: boolean
	) {
		await apiPost('/api/admin/llm-providers/toggle', { provider, active });
		await invalidateAll();
	}

	async function addLlmModel(
		provider: 'anthropic' | 'openai' | 'google' | 'xai',
		apiModelName: string,
		displayName: string
	) {
		await apiPost('/api/admin/llm-models', { provider, apiModelName, displayName });
		await invalidateAll();
	}

	async function updateLlmModel(id: string, apiModelName: string, displayName: string) {
		await apiPut(`/api/admin/llm-models/${id}`, { apiModelName, displayName });
		await invalidateAll();
	}

	function deleteLlmModel(id: string) {
		openConfirm(async () => {
			await apiDelete(`/api/admin/llm-models/${id}`);
			await invalidateAll();
		});
	}

	async function toggleLlmModel(id: string, active: boolean) {
		await apiPost(`/api/admin/llm-models/${id}/toggle`, { active });
		await invalidateAll();
	}

	function openHistoryModal(userId: string, userName: string) {
		historyUserId = userId;
		historyUserName = userName;
		showHistoryModal = true;
	}

	function openBanModal(userId: string) {
		banningUserId = userId;
		showBanModal = true;
	}

	async function submitBan(banData: { startAt: string; endAt: string; reason: string }) {
		await apiPost(`/api/admin/users/${banningUserId}/ban`, banData);
		await invalidateAll();
		showBanModal = false;
		banningUserId = '';
	}

	function openUnbanModal(userId: string) {
		unbanningUserId = userId;
		showUnbanModal = true;
	}

	async function submitUnban(reason: string) {
		await apiPost(`/api/admin/users/${unbanningUserId}/unban`, { reason });
		await invalidateAll();
		showUnbanModal = false;
		unbanningUserId = '';
	}

	async function setRole(userId: string, role: 'admin' | 'user') {
		await apiPost(`/api/admin/users/${userId}/role`, { role });
		await invalidateAll();
	}

	function closeRoom(roomId: string) {
		openConfirm(async () => {
			await apiPost(`/api/admin/rooms/${roomId}/close`);
			await invalidateAll();
		});
	}

	function editAssistant(assistant: Assistant) {
		editingAssistant = assistant;
		showAssistantForm = true;
	}

	async function saveAssistant(assistant: Omit<Assistant, 'id' | 'created' | 'updated'>) {
		if (editingAssistant) {
			await apiPut(`/api/admin/assistants/${editingAssistant.id}`, assistant);
		} else {
			await apiPost('/api/admin/assistants', assistant);
		}

		await invalidateAll();
		showAssistantForm = false;
		editingAssistant = null;
	}

	function deleteAssistant(assistantId: string) {
		openConfirm(async () => {
			await apiDelete(`/api/admin/assistants/${assistantId}`);
			await invalidateAll();
		});
	}

	function closeAssistantForm() {
		showAssistantForm = false;
		editingAssistant = null;
	}

	function editRulebook(rulebook: Rulebook) {
		editingRulebook = rulebook;
		showRulebookForm = true;
	}

	async function saveRulebook(rulebook: Omit<Rulebook, 'id' | 'created' | 'updated'>) {
		if (editingRulebook) {
			await apiPut(`/api/admin/rulebook/${editingRulebook.id}`, rulebook);
		} else {
			await apiPost('/api/admin/rulebook', rulebook);
		}

		await invalidateAll();
		showRulebookForm = false;
		editingRulebook = null;
	}

	function deleteRulebook(rulebookId: string) {
		openConfirm(async () => {
			await apiDelete(`/api/admin/rulebook/${rulebookId}`);
			await invalidateAll();
		});
	}

	function closeRulebookForm() {
		showRulebookForm = false;
		editingRulebook = null;
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
				totalUsers={data.users.length}
				activeNow={data.users.filter((u: { banned: boolean }) => !u.banned).length}
				activeRooms={data.rooms.length}
				gamesToday={0}
			/>

			<!-- Quick overview sections -->
			<section>
				<h2
					class="mb-3 flex items-center gap-2 text-sm font-black tracking-widest text-slate-500 uppercase"
				>
					<span class="material-symbols-outlined text-primary">group</span>
					{m.admin_users()}
				</h2>
				<AdminUserList
					users={data.users}
					onban={openBanModal}
					onunban={openUnbanModal}
					onrole={setRole}
					onhistory={openHistoryModal}
				/>
			</section>

			<section>
				<h2
					class="mb-3 flex items-center gap-2 text-sm font-black tracking-widest text-slate-500 uppercase"
				>
					<span class="material-symbols-outlined text-primary">meeting_room</span>
					{m.admin_rooms()}
				</h2>
				<AdminRoomList rooms={data.rooms} onclose={closeRoom} />
			</section>
		{:else if activeTab === 'users'}
			<h2
				class="flex items-center gap-2 text-sm font-black tracking-widest text-slate-500 uppercase"
			>
				<span class="material-symbols-outlined text-primary">group</span>
				{m.admin_users()}
			</h2>
			<AdminUserList
				users={data.users}
				onban={openBanModal}
				onunban={openUnbanModal}
				onrole={setRole}
				onhistory={openHistoryModal}
			/>
		{:else if activeTab === 'rooms'}
			<h2
				class="flex items-center gap-2 text-sm font-black tracking-widest text-slate-500 uppercase"
			>
				<span class="material-symbols-outlined text-primary">meeting_room</span>
				{m.admin_rooms()}
			</h2>
			<AdminRoomList rooms={data.rooms} onclose={closeRoom} />
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
				onsave={saveLlmApiKey}
				ontoggle={toggleLlmProvider}
				onaddmodel={addLlmModel}
				onupdatemodel={updateLlmModel}
				ondeletemodel={deleteLlmModel}
				ontogglemodel={toggleLlmModel}
			/>
		{:else if activeTab === 'assistant'}
			<div class="flex items-center justify-between">
				<h2
					class="flex items-center gap-2 text-sm font-black tracking-widest text-slate-500 uppercase"
				>
					<span class="material-symbols-outlined text-primary">psychology</span>
					{m.admin_assistant()}
				</h2>
				<AddButton
					label={m.admin_add_assistant()}
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
	{:else if activeTab === 'rulebook'}
		<div class="flex items-center justify-between">
			<h2
				class="flex items-center gap-2 text-sm font-black tracking-widest text-slate-500 uppercase"
			>
				<span class="material-symbols-outlined text-primary">menu_book</span>
				룰북
			</h2>
			<AddButton
				label="룰북 추가"
				onclick={() => {
					editingRulebook = null;
					showRulebookForm = true;
				}}
			/>
		</div>
		<AdminRulebookList
			rulebooks={data.rulebooks}
			onedit={editRulebook}
			ondelete={deleteRulebook}
		/>
		{#if showRulebookForm}
			<AdminRulebookForm
				isOpen={showRulebookForm}
				{editingRulebook}
				onsave={saveRulebook}
				oncancel={closeRulebookForm}
			/>
		{/if}
		{/if}
	</main>
</div>

<AdminBanModal
	isOpen={showBanModal}
	onsave={submitBan}
	oncancel={() => {
		showBanModal = false;
		banningUserId = '';
	}}
/>

<AdminUnbanModal
	isOpen={showUnbanModal}
	onsave={submitUnban}
	oncancel={() => {
		showUnbanModal = false;
		unbanningUserId = '';
	}}
/>

<AdminBanHistoryModal
	isOpen={showHistoryModal}
	userId={historyUserId}
	userName={historyUserName}
	onclose={() => {
		showHistoryModal = false;
		historyUserId = '';
		historyUserName = '';
	}}
/>

<ConfirmModal isOpen={showConfirmModal} onconfirm={handleConfirm} oncancel={handleCancelConfirm} />
