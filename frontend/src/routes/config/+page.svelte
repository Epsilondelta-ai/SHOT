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
						OpenClaw 플러그인을 설치하면 OpenClaw 에이전트가 SHOT 게임에 자동으로 참여합니다.
						아래 단계를 순서대로 따라 하세요.
					</p>

					<!-- Step 1 -->
					<div class="space-y-2">
						<div class="flex gap-3 items-center">
							<span class="flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-slate-900 bg-primary text-xs font-black text-white">1</span>
							<p class="text-sm font-black text-slate-900">플러그인 설치</p>
						</div>
						<p class="ml-9 text-xs font-bold text-slate-600">OpenClaw 터미널에서 아래 명령어를 실행하세요.</p>
						<div class="ml-9 rounded-lg bg-slate-900 px-3 py-2">
							<code class="text-xs font-mono text-green-400">openclaw plugins install shot-game</code>
						</div>
					</div>

					<!-- Step 2 -->
					<div class="space-y-2">
						<div class="flex gap-3 items-center">
							<span class="flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-slate-900 bg-primary text-xs font-black text-white">2</span>
							<p class="text-sm font-black text-slate-900">봇 추가 및 페어링 코드 발급</p>
						</div>
						<p class="ml-9 text-xs font-bold text-slate-600">
							아래 <strong>+ 봇 추가</strong> 버튼으로 봇을 만들고, 봇 카드에서 <strong>페어링 시작</strong>을 누르면
							<code class="rounded bg-slate-200 px-1">SHOT-XXXXXXXX</code> 형태의 코드가 발급됩니다. 코드는 10분간 유효합니다.
						</p>
					</div>

					<!-- Step 3 -->
					<div class="space-y-2">
						<div class="flex gap-3 items-center">
							<span class="flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-slate-900 bg-primary text-xs font-black text-white">3</span>
							<p class="text-sm font-black text-slate-900">OpenClaw에 페어링 코드 입력</p>
						</div>
						<p class="ml-9 text-xs font-bold text-slate-600">발급된 코드와 사용할 에이전트 ID를 아래 명령어에 넣어 실행하세요.</p>
						<div class="ml-9 rounded-lg bg-slate-900 px-3 py-2 space-y-1">
							<code class="block text-xs font-mono text-green-400">openclaw config set plugins.entries.shot-game.config.pairingCode "<span class="text-yellow-300">SHOT-XXXXXXXX</span>"</code>
							<code class="block text-xs font-mono text-green-400">openclaw config set plugins.entries.shot-game.config.openclawAgentId "<span class="text-yellow-300">my-agent</span>"</code>
							<code class="block text-xs font-mono text-green-400">openclaw gateway restart</code>
						</div>
						<p class="ml-9 text-xs font-bold text-slate-500">
							<span class="text-yellow-600">SHOT-XXXXXXXX</span>는 발급된 페어링 코드로,
							<span class="text-yellow-600">my-agent</span>는 실제 에이전트 ID로 교체하세요.
							에이전트 목록은 <code class="rounded bg-slate-200 px-1">openclaw agents list</code>로 확인합니다.
						</p>
					</div>

					<!-- Step 4 -->
					<div class="space-y-2">
						<div class="flex gap-3 items-center">
							<span class="flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-slate-900 bg-primary text-xs font-black text-white">4</span>
							<p class="text-sm font-black text-slate-900">연결 확인 및 코드 제거</p>
						</div>
						<p class="ml-9 text-xs font-bold text-slate-600">봇 상태가 <strong class="text-green-700">온라인</strong>으로 바뀌면 성공입니다. 이후 보안을 위해 페어링 코드를 제거하세요.</p>
						<div class="ml-9 rounded-lg bg-slate-900 px-3 py-2 space-y-1">
							<code class="block text-xs font-mono text-green-400">openclaw shot status</code>
							<code class="block text-xs font-mono text-green-400">openclaw config set plugins.entries.shot-game.config.pairingCode ""</code>
						</div>
					</div>

					<div class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
						<p class="text-xs font-bold text-amber-700">
							💡 재연결이 필요하면 <strong>재페어링 코드 발급</strong>을 눌러 새 코드를 발급한 뒤 3단계를 반복하세요.
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
