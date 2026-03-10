<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import AdminHeader from '$lib/components/admin/AdminHeader.svelte';
	import AdminStats from '$lib/components/admin/AdminStats.svelte';
	import AdminUserList from '$lib/components/admin/AdminUserList.svelte';
	import AdminRoomList from '$lib/components/admin/AdminRoomList.svelte';
	import AdminLLMConfig from '$lib/components/admin/AdminLLMConfig.svelte';
	import AdminAssistantList from '$lib/components/admin/AdminAssistantList.svelte';
	import AdminAssistantForm from '$lib/components/admin/AdminAssistantForm.svelte';
	import AdminBanModal from '$lib/components/admin/AdminBanModal.svelte';
	import AdminUnbanModal from '$lib/components/admin/AdminUnbanModal.svelte';
	import AdminBanHistoryModal from '$lib/components/admin/AdminBanHistoryModal.svelte';
	import { invalidateAll } from '$app/navigation';

	let { data } = $props();

	type Tab = 'dashboard' | 'users' | 'rooms' | 'llm' | 'assistant';

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
	let showBanModal = $state(false);
	let banningUserId = $state('');
	let showUnbanModal = $state(false);
	let unbanningUserId = $state('');
	let showHistoryModal = $state(false);
	let historyUserId = $state('');
	let historyUserName = $state('');

	const llmProviders = $derived(data.llmProviders);

	async function saveLlmApiKey(
		provider: 'anthropic' | 'openai' | 'google' | 'xai',
		apiKey: string
	) {
		const fd = new FormData();
		fd.set('provider', provider);
		fd.set('apiKey', apiKey);
		await fetch('?/saveLlmApiKey', { method: 'POST', body: fd });
		await invalidateAll();
	}

	async function toggleLlmProvider(
		provider: 'anthropic' | 'openai' | 'google' | 'xai',
		active: boolean
	) {
		const fd = new FormData();
		fd.set('provider', provider);
		fd.set('active', String(active));
		await fetch('?/toggleLlmProvider', { method: 'POST', body: fd });
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
		const fd = new FormData();
		fd.set('id', banningUserId);
		fd.set('startAt', banData.startAt);
		fd.set('endAt', banData.endAt);
		fd.set('reason', banData.reason);
		await fetch('?/banUser', { method: 'POST', body: fd });
		await invalidateAll();
		showBanModal = false;
		banningUserId = '';
	}

	function openUnbanModal(userId: string) {
		unbanningUserId = userId;
		showUnbanModal = true;
	}

	async function submitUnban(reason: string) {
		const fd = new FormData();
		fd.set('id', unbanningUserId);
		fd.set('reason', reason);
		await fetch('?/unbanUser', { method: 'POST', body: fd });
		await invalidateAll();
		showUnbanModal = false;
		unbanningUserId = '';
	}

	async function setRole(userId: string, role: 'admin' | 'user') {
		const fd = new FormData();
		fd.set('userId', userId);
		fd.set('role', role);
		await fetch('?/setRole', { method: 'POST', body: fd });
		await invalidateAll();
	}

	async function closeRoom(roomId: string) {
		const fd = new FormData();
		fd.set('id', roomId);
		await fetch('?/closeRoom', { method: 'POST', body: fd });
		await invalidateAll();
	}

	function editAssistant(assistant: Assistant) {
		editingAssistant = assistant;
		showAssistantForm = true;
	}

	async function saveAssistant(assistant: Omit<Assistant, 'id' | 'created' | 'updated'>) {
		const fd = new FormData();
		fd.set('name', assistant.name);
		fd.set('prompt', assistant.prompt);
		fd.set('active', String(assistant.active));

		if (editingAssistant) {
			fd.set('id', editingAssistant.id);
			await fetch('?/updateAssistant', { method: 'POST', body: fd });
		} else {
			await fetch('?/createAssistant', { method: 'POST', body: fd });
		}

		await invalidateAll();
		showAssistantForm = false;
		editingAssistant = null;
	}

	async function deleteAssistant(assistantId: string) {
		const fd = new FormData();
		fd.set('id', assistantId);
		await fetch('?/deleteAssistant', { method: 'POST', body: fd });
		await invalidateAll();
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
				totalUsers={data.users.length}
				activeNow={data.users.filter((u) => !u.banned).length}
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
				onsave={saveLlmApiKey}
				ontoggle={toggleLlmProvider}
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
