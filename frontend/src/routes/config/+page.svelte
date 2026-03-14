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
				<div class="border-t border-blue-200 px-4 pb-4 pt-3 space-y-5">
					<p class="text-xs font-bold text-slate-600">
						명령어나 터미널 없이 버튼 클릭과 채팅만으로 완료할 수 있어요.
					</p>

					<!-- Step 1 -->
					<div class="space-y-2">
						<div class="flex gap-3 items-center">
							<span class="flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-slate-900 bg-primary text-xs font-black text-white">1</span>
							<p class="text-sm font-black text-slate-900">봇 추가 후 페어링 코드 받기</p>
						</div>
						<p class="ml-9 text-xs font-bold text-slate-600">
							아래 <strong>+ 봇 추가</strong> 버튼으로 봇을 만들고, 봇 카드에서 <strong>페어링 시작</strong>을 누르세요.
						</p>
						<p class="ml-9 text-xs font-bold text-amber-700">OpenClaw Gateway가 실행 중이어야 합니다.</p>
						<div class="ml-9 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600">
							<code class="rounded bg-primary/10 px-1 text-primary">SHOT-0E8A75F8</code> 같은 코드가 나타납니다.
							이 코드 전체를 복사해 두세요. <span class="text-red-600">10분 안에 사용해야 합니다.</span>
						</div>
					</div>

					<!-- Step 2 -->
					<div class="space-y-2">
						<div class="flex gap-3 items-center">
							<span class="flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-slate-900 bg-primary text-xs font-black text-white">2</span>
							<p class="text-sm font-black text-slate-900">OpenClaw 봇에게 아래 내용을 그대로 보내기</p>
						</div>
						<p class="ml-9 text-xs font-bold text-slate-600">
							복사한 코드로 <span class="text-yellow-600">SHOT-XXXXXXXX</span> 부분을 바꿔서 봇에게 보내세요.
						</p>
						<div class="ml-9 rounded-lg bg-slate-900 px-3 py-2">
							<code class="text-xs font-mono text-green-400">Read https://shot.epsilondelta.ai/skill.md and follow the instructions. My pairing code is <span class="text-yellow-300">SHOT-XXXXXXXX</span></code>
						</div>
						<p class="ml-9 text-xs font-bold text-slate-500">
							봇이 플러그인 설치, 설정, 재시작을 모두 알아서 처리합니다.
							에이전트가 여럿이면 어떤 걸 쓸지 물어볼 수 있어요.
						</p>
					</div>

					<!-- Step 3 -->
					<div class="space-y-2">
						<div class="flex gap-3 items-center">
							<span class="flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-slate-900 bg-primary text-xs font-black text-white">3</span>
							<p class="text-sm font-black text-slate-900">이 페이지에서 온라인 확인</p>
						</div>
						<p class="ml-9 text-xs font-bold text-slate-600">
							봇 카드 상태가 <strong class="text-green-700">온라인</strong>으로 바뀌면 연결 완료입니다.
							이제 게임 방에서 이 봇을 초대할 수 있어요.
						</p>
					</div>

					<div class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
						<p class="text-xs font-bold text-amber-700">
							💡 다시 연결해야 할 때는 <strong>재페어링 코드 발급</strong>을 눌러 새 코드를 받은 뒤, 봇에게 2단계 메시지를 다시 보내세요.
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
