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
		clientMode: 'autonomous' | 'follow-owner' | null;
		followUserId: string | null;
		presenceStatus: 'online' | 'offline';
		created: string | null;
		updated: string | null;
		lastSeenAt: string | null;
		busy?: boolean;
	};

	let activeTab: Tab = $state('bot');
	let showBotForm = $state(false);
	let editingBot: Bot | null = $state(null);
	let showConfirmModal = $state(false);
	let confirmCallback = $state<(() => void) | null>(null);
	let newApiKey = $state<string | null>(null);
	let newBotName = $state<string | null>(null);

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

	async function saveBot(bot: Omit<Bot, 'id' | 'presenceStatus' | 'created' | 'updated' | 'lastSeenAt' | 'busy'>) {
		if (editingBot) {
			await apiPut(`/api/bots/${editingBot.id}`, bot);
		} else {
			const result = await apiPost<{ bot: Bot; apiKey: string }>('/api/bots', bot);
			newApiKey = result.apiKey;
			newBotName = result.bot.name;
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

	function closeBotForm() {
		showBotForm = false;
		editingBot = null;
	}

	let guideOpen = $state(false);
</script>

<svelte:head>
	<title>{m.config_title()}</title>
</svelte:head>

<div class="flex min-h-screen flex-col bg-background-light font-display text-slate-900">
	<LobbyHeader username={data.username} avatarSrc={data.avatarSrc} isAdmin={data.isAdmin} />
	<ConfigHeader {activeTab} onchange={(tab) => (activeTab = tab)} />

	<main class="mx-auto w-full max-w-2xl flex-1 space-y-4 p-4 pb-24">

		<!-- API Key 발급 알림 -->
		{#if newApiKey}
			<div class="comic-border rounded-lg border-2 border-green-700 bg-green-50 p-4">
				<div class="mb-2 flex items-center justify-between">
					<p class="font-black text-green-800">봇 "{newBotName}" 생성 완료!</p>
					<button
						class="material-symbols-outlined text-green-700 hover:text-green-900"
						onclick={() => { newApiKey = null; newBotName = null; }}
					>close</button>
				</div>
				<p class="mb-2 text-xs font-bold text-green-700">
					API 키는 지금만 표시됩니다. 반드시 복사해두세요.
				</p>
				<div class="flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2">
					<code class="flex-1 break-all font-mono text-xs text-green-400">{newApiKey}</code>
					<button
						class="material-symbols-outlined shrink-0 text-slate-400 hover:text-white"
						title="복사"
						onclick={() => navigator.clipboard.writeText(newApiKey!)}
					>content_copy</button>
				</div>
				<p class="mt-2 text-xs font-bold text-green-700">
					봇 프로세스에서 <code class="rounded bg-green-100 px-1">Authorization: Bot &lt;API 키&gt;</code> 헤더로 인증하세요.
				</p>
			</div>
		{/if}

		<!-- 봇 클라이언트 가이드 -->
		<div class="comic-border rounded-lg border-2 border-slate-900 bg-blue-50">
			<button
				type="button"
				class="flex w-full items-center justify-between px-4 py-3"
				onclick={() => (guideOpen = !guideOpen)}
			>
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-blue-600">help_outline</span>
					<span class="font-black text-slate-900 uppercase">봇 클라이언트 설정 가이드</span>
				</div>
				<span class="material-symbols-outlined text-slate-500">
					{guideOpen ? 'expand_less' : 'expand_more'}
				</span>
			</button>

			{#if guideOpen}
				<div class="space-y-5 border-t border-blue-200 px-4 pb-4 pt-3">
					<p class="text-xs font-bold text-slate-600">
						봇 계정을 만들고 API 키로 인증하면 봇이 자동으로 게임에 참가합니다.
					</p>

					<!-- Step 1 -->
					<div class="space-y-2">
						<div class="flex items-center gap-3">
							<span class="flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-slate-900 bg-primary text-xs font-black text-white">1</span>
							<p class="text-sm font-black text-slate-900">봇 추가 후 API 키 복사</p>
						</div>
						<p class="ml-9 text-xs font-bold text-slate-600">
							아래 <strong>+ 봇 추가</strong> 버튼으로 봇을 만드세요. 생성 직후 API 키가 표시됩니다.
						</p>
						<div class="ml-9 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
							<p class="text-xs font-bold text-amber-700">
								API 키는 생성 시 한 번만 표시됩니다. 반드시 복사해두세요.
							</p>
						</div>
					</div>

					<!-- Step 2 -->
					<div class="space-y-2">
						<div class="flex items-center gap-3">
							<span class="flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-slate-900 bg-primary text-xs font-black text-white">2</span>
							<p class="text-sm font-black text-slate-900">봇 프로세스 실행</p>
						</div>
						<p class="ml-9 text-xs font-bold text-slate-600">
							봇은 모든 요청에 아래 헤더를 포함해야 합니다.
						</p>
						<div class="ml-9 rounded-lg bg-slate-900 px-3 py-2">
							<code class="font-mono text-xs text-green-400">Authorization: Bot &lt;API 키&gt;</code>
						</div>
						<p class="ml-9 text-xs font-bold text-slate-600">
							30초마다 <code class="rounded bg-slate-100 px-1 text-slate-700">POST /api/bot-client/heartbeat</code>를 호출해 온라인 상태를 유지하세요.
						</p>
					</div>

					<!-- Step 3 -->
					<div class="space-y-2">
						<div class="flex items-center gap-3">
							<span class="flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-slate-900 bg-primary text-xs font-black text-white">3</span>
							<p class="text-sm font-black text-slate-900">모드별 방 참가</p>
						</div>
						<div class="ml-9 space-y-2">
							<div class="rounded-lg bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">
								<p class="mb-1 text-slate-800">자율 모드</p>
								<code class="text-slate-500">GET /api/bot-client/rooms</code> → <code class="text-slate-500">POST /api/bot-client/rooms/:id/join</code>
							</div>
							<div class="rounded-lg bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">
								<p class="mb-1 text-slate-800">팔로우 모드</p>
								<code class="text-slate-500">GET /api/bot-client/rooms/follow</code> → <code class="text-slate-500">POST /api/bot-client/rooms/:id/join</code>
							</div>
						</div>
					</div>

					<!-- Step 4 -->
					<div class="space-y-2">
						<div class="flex items-center gap-3">
							<span class="flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-slate-900 bg-primary text-xs font-black text-white">4</span>
							<p class="text-sm font-black text-slate-900">턴 폴링 및 액션 제출</p>
						</div>
						<div class="ml-9 rounded-lg bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 space-y-1">
							<p><code class="text-slate-500">GET /api/bot-client/games/:id/turn</code> — 내 턴 대기 (롱폴링)</p>
							<p><code class="text-slate-500">POST /api/bot-client/games/:id/actions</code> — 액션 제출</p>
						</div>
					</div>

					<!-- Step 5 -->
					<div class="space-y-2">
						<div class="flex items-center gap-3">
							<span class="flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-slate-900 bg-primary text-xs font-black text-white">5</span>
							<p class="text-sm font-black text-slate-900">이 페이지에서 온라인 확인</p>
						</div>
						<p class="ml-9 text-xs font-bold text-slate-600">
							봇 카드 상태가 <strong class="text-green-700">온라인</strong>으로 바뀌면 연결 완료입니다.
						</p>
					</div>
				</div>
			{/if}
		</div>

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
			onedit={editBot}
			ondelete={deleteBot}
		/>

		{#if showBotForm}
			<ConfigBotForm isOpen={showBotForm} {editingBot} onsave={saveBot} oncancel={closeBotForm} />
		{/if}
	</main>

	<BottomNav active="config" />
</div>

<ConfirmModal isOpen={showConfirmModal} onconfirm={handleConfirm} oncancel={handleCancelConfirm} />
