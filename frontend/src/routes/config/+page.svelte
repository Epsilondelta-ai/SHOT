<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import ConfigHeader from '$lib/components/config/ConfigHeader.svelte';
	import ConfigBotList from '$lib/components/config/ConfigBotList.svelte';
	import ConfigBotForm from '$lib/components/config/ConfigBotForm.svelte';
	import BottomNav from '$lib/components/lobby/BottomNav.svelte';
	import LobbyHeader from '$lib/components/lobby/LobbyHeader.svelte';
	import { invalidateAll } from '$app/navigation';
	import { onDestroy } from 'svelte';
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

	async function saveBot(bot: { name: string; active: boolean }) {
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

	let guideOpen = $state(false);
	let pollTimer: ReturnType<typeof setInterval> | null = null;

	$effect(() => {
		const hasPairing = data.bots.some((b: Bot) => b.pairingStatus === 'pairing');
		if (hasPairing && !pollTimer) {
			pollTimer = setInterval(() => invalidateAll(), 3000);
		} else if (!hasPairing && pollTimer) {
			clearInterval(pollTimer);
			pollTimer = null;
		}
	});

	onDestroy(() => {
		if (pollTimer) clearInterval(pollTimer);
	});
</script>

<svelte:head>
	<title>{m.config_title()}</title>
</svelte:head>

<div class="flex min-h-screen flex-col bg-background-light font-display text-slate-900">
	<LobbyHeader username={data.username} avatarSrc={data.avatarSrc} isAdmin={data.isAdmin} />
	<ConfigHeader {activeTab} onchange={(tab) => (activeTab = tab)} />

	<main class="mx-auto w-full max-w-2xl flex-1 space-y-4 p-4 pb-24">
		<!-- OpenClaw 가이드 -->
		<div class="comic-border rounded-lg border-2 border-slate-900 bg-blue-50">
			<button
				type="button"
				class="flex w-full items-center justify-between px-4 py-3"
				onclick={() => (guideOpen = !guideOpen)}
			>
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-blue-600">help_outline</span>
					<span class="font-black text-slate-900 uppercase">OpenClaw 봇 설정 가이드</span>
				</div>
				<span class="material-symbols-outlined text-slate-500">
					{guideOpen ? 'expand_less' : 'expand_more'}
				</span>
			</button>

			{#if guideOpen}
				<div class="border-t border-blue-200 px-4 pb-4 pt-3 space-y-4">
					<p class="text-xs font-bold text-slate-600">
						OpenClaw 봇은 실제 게임 클라이언트와 SHOT 서버를 연결해주는 커넥터입니다.
						아래 단계를 따라 봇을 등록하고 연결하세요.
					</p>

					<ol class="space-y-3">
						<li class="flex gap-3">
							<span class="flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-slate-900 bg-primary text-xs font-black text-white">1</span>
							<div>
								<p class="text-sm font-black text-slate-900">봇 추가</p>
								<p class="text-xs font-bold text-slate-600">우측 상단 <strong>+ 봇 추가</strong> 버튼을 눌러 이름을 입력하고 저장하세요.</p>
							</div>
						</li>
						<li class="flex gap-3">
							<span class="flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-slate-900 bg-primary text-xs font-black text-white">2</span>
							<div>
								<p class="text-sm font-black text-slate-900">페어링 코드 발급</p>
								<p class="text-xs font-bold text-slate-600">봇 카드에서 <strong>페어링 시작</strong>을 클릭하면 6자리 코드가 발급됩니다. 코드는 10분간 유효합니다.</p>
							</div>
						</li>
						<li class="flex gap-3">
							<span class="flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-slate-900 bg-primary text-xs font-black text-white">3</span>
							<div>
								<p class="text-sm font-black text-slate-900">OpenClaw 커넥터 연결</p>
								<p class="text-xs font-bold text-slate-600">OpenClaw 앱(커넥터)을 실행하고 <strong>서버 주소</strong>와 발급된 <strong>페어링 코드</strong>를 입력하세요.</p>
							</div>
						</li>
						<li class="flex gap-3">
							<span class="flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-slate-900 bg-primary text-xs font-black text-white">4</span>
							<div>
								<p class="text-sm font-black text-slate-900">연결 확인</p>
								<p class="text-xs font-bold text-slate-600">봇 상태가 <strong class="text-green-700">온라인</strong>으로 바뀌면 연결 완료입니다. 이제 게임 방에서 봇을 초대할 수 있습니다.</p>
							</div>
						</li>
					</ol>

					<div class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
						<p class="text-xs font-bold text-amber-700">
							💡 재연결이 필요한 경우 <strong>재페어링 코드 발급</strong>을 눌러 새 코드를 발급하세요.
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
			{pairingCodes}
			onedit={editBot}
			ondelete={deleteBot}
			onpairstart={startPairing}
			onpaircancel={cancelPairing}
		/>
		{#if showBotForm}
			<ConfigBotForm isOpen={showBotForm} {editingBot} onsave={saveBot} oncancel={closeBotForm} />
		{/if}
	</main>

	<BottomNav active="config" />
</div>

<ConfirmModal isOpen={showConfirmModal} onconfirm={handleConfirm} oncancel={handleCancelConfirm} />
