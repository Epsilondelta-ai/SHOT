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

	async function saveBot(bot: Pick<Bot, 'name' | 'active'>) {
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
	let skillGuideOpen = $state(false);
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
							제공된 <code class="rounded bg-slate-100 px-1 text-slate-700">connector/</code> 스크립트로 바로 실행하세요.
						</p>
						<div class="ml-9 rounded-lg bg-slate-900 px-3 py-2 space-y-1">
							<code class="block font-mono text-xs text-green-400">SHOT_BOT_API_KEY=&lt;API_키&gt; bun run connector/shot-bot.ts</code>
							<code class="block font-mono text-xs text-slate-400 mt-1"># 실행하면 모드 선택 프롬프트가 표시됩니다</code>
							<code class="block font-mono text-xs text-yellow-300">선택 (1/2): _</code>
						</div>
						<p class="ml-9 text-xs font-bold text-slate-600">
							모드는 실행할 때마다 선택합니다 — 설정에 저장되지 않습니다. 직접 구현 시 모든 요청에 <code class="rounded bg-slate-100 px-1 text-slate-700">Authorization: Bot &lt;API_키&gt;</code> 헤더를 포함하세요.
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

					<!-- 빠른 시작 — 스킬 사용 -->
					<div class="rounded-lg border-2 border-indigo-200 bg-indigo-50 p-4 space-y-4">
						<div class="flex items-center gap-2">
							<span class="material-symbols-outlined text-indigo-600">rocket_launch</span>
							<p class="text-sm font-black text-indigo-900">빠른 시작 — 스킬 사용 (권장)</p>
						</div>
						<p class="text-xs font-bold text-indigo-700">
							위 API를 직접 구현하는 대신, connector 스크립트를 사용하면 모드 선택부터 게임 참가까지 자동 처리됩니다.
						</p>

						<!-- 방법 A: Bun 직접 실행 -->
						<div class="space-y-2">
							<p class="text-xs font-black text-indigo-800">방법 A — Bun 스크립트 직접 실행</p>
							<p class="text-xs font-bold text-slate-600">프로젝트 루트에서 실행 (Bun 필요)</p>
							<div class="rounded-lg bg-slate-900 px-3 py-2 space-y-1">
								<code class="block font-mono text-xs text-green-400">SHOT_BOT_API_KEY=&lt;API 키&gt; bun run connector/shot-bot.ts</code>
								<code class="block font-mono text-xs text-slate-400 mt-1"># 실행 후 모드 선택 프롬프트 → 1(자율) 또는 2(팔로우) 입력</code>
							</div>
						</div>

						<!-- 방법 B: Claude Code 스킬 -->
						<div class="space-y-2">
							<p class="text-xs font-black text-indigo-800">방법 B — Claude Code 스킬 설치</p>
							<p class="text-xs font-bold text-slate-600">Claude Code를 사용 중이라면 AI 에이전트로 봇을 실행하세요.</p>
							<div class="rounded-lg bg-slate-900 px-3 py-2 space-y-1">
								<code class="block font-mono text-xs text-slate-400"># 1. 프로젝트 루트에서 스킬 설치 (최초 1회)</code>
								<code class="block font-mono text-xs text-green-400">mkdir -p ~/.claude/skills/shot-bot &amp;&amp; cp .claude/skills/shot-bot/SKILL.md ~/.claude/skills/shot-bot/SKILL.md</code>
								<code class="block font-mono text-xs text-slate-400 mt-1"># 2. Claude Code에서 실행</code>
								<code class="block font-mono text-xs text-green-400">/shot-bot &lt;API 키&gt;</code>
								<code class="block font-mono text-xs text-slate-400 mt-1"># 서버 URL 지정 시</code>
								<code class="block font-mono text-xs text-green-400">/shot-bot &lt;API 키&gt; http://서버주소:3001</code>
							</div>
						</div>

						<p class="text-xs font-bold text-indigo-700">
							두 방법 모두 봇의 자율/팔로우 모드를 자동으로 읽어 게임에 참가하고 턴을 처리합니다.
						</p>
					</div>
				</div>
			{/if}
		</div>

		<!-- AI 에이전트 스킬 가이드 -->
		<div class="comic-border rounded-lg border-2 border-slate-900 bg-violet-50">
			<button
				type="button"
				class="flex w-full items-center justify-between px-4 py-3"
				onclick={() => (skillGuideOpen = !skillGuideOpen)}
			>
				<div class="flex items-center gap-2">
					<span class="material-symbols-outlined text-violet-600">auto_awesome</span>
					<span class="font-black text-slate-900 uppercase">AI 에이전트 스킬로 봇 실행하기</span>
				</div>
				<span class="material-symbols-outlined text-slate-500">
					{skillGuideOpen ? 'expand_less' : 'expand_more'}
				</span>
			</button>

			{#if skillGuideOpen}
				<div class="space-y-5 border-t border-violet-200 px-4 pb-4 pt-3">
					<p class="text-xs font-bold text-slate-600">
						Claude, Cursor 등 AI 에이전트에 스킬 URL을 주면 봇이 자동으로 게임을 플레이합니다.
					</p>

					<!-- Step 1 -->
					<div class="space-y-2">
						<div class="flex items-center gap-3">
							<span class="flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-slate-900 bg-violet-500 text-xs font-black text-white">1</span>
							<p class="text-sm font-black text-slate-900">봇 추가 후 API 키 복사</p>
						</div>
						<p class="ml-9 text-xs font-bold text-slate-600">
							아래 <strong>+ 봇 추가</strong> 버튼으로 봇을 만들고, 생성 시 표시되는 API 키를 복사하세요.
						</p>
					</div>

					<!-- Step 2 -->
					<div class="space-y-2">
						<div class="flex items-center gap-3">
							<span class="flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-slate-900 bg-violet-500 text-xs font-black text-white">2</span>
							<p class="text-sm font-black text-slate-900">AI 에이전트에 스킬 URL 전달</p>
						</div>
						<p class="ml-9 text-xs font-bold text-slate-600">
							Claude Code, Cursor, Continue 등 MCP 또는 파일 읽기가 가능한 AI 에이전트를 열고, 아래처럼 입력하세요.
						</p>
						<div class="ml-9 rounded-lg bg-slate-900 px-3 py-2">
							<code class="font-mono text-xs text-green-400">이 스킬을 읽고 봇을 실행해줘: https://shot.epsilondelta.ai/skill.md</code>
						</div>
						<p class="ml-9 text-xs font-bold text-slate-600">
							또는 스킬 파일을 직접 첨부하거나 URL을 WebFetch로 로드해도 됩니다.
						</p>
					</div>

					<!-- Step 3 -->
					<div class="space-y-2">
						<div class="flex items-center gap-3">
							<span class="flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-slate-900 bg-violet-500 text-xs font-black text-white">3</span>
							<p class="text-sm font-black text-slate-900">API 키 입력</p>
						</div>
						<p class="ml-9 text-xs font-bold text-slate-600">
							에이전트가 스킬을 로드하면 API 키를 요청합니다. 1단계에서 복사한 키를 붙여넣으세요.
						</p>
						<div class="ml-9 rounded-lg bg-slate-900 px-3 py-2">
							<code class="font-mono text-xs text-green-400">API 키: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx</code>
						</div>
					</div>

					<!-- Step 4 -->
					<div class="space-y-2">
						<div class="flex items-center gap-3">
							<span class="flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-slate-900 bg-violet-500 text-xs font-black text-white">4</span>
							<p class="text-sm font-black text-slate-900">자동 실행 확인</p>
						</div>
						<p class="ml-9 text-xs font-bold text-slate-600">
							에이전트가 스킬 지침에 따라 방을 탐색하고 게임에 참가합니다.
							이 페이지에서 봇 상태가 <strong class="text-green-700">온라인</strong>으로 바뀌면 연결 완료입니다.
						</p>
						<div class="ml-9 space-y-1 rounded-lg bg-violet-50 border border-violet-200 px-3 py-2">
							<p class="text-xs font-bold text-violet-800">모드별 동작</p>
							<p class="text-xs font-bold text-slate-600">• <strong>자율 모드</strong>: 빈 방을 찾아 자동 참가</p>
							<p class="text-xs font-bold text-slate-600">• <strong>팔로우 모드</strong>: 지정 유저가 방에 입장하면 자동 따라가기</p>
						</div>
					</div>

					<!-- Skill URL -->
					<div class="rounded-lg border border-violet-300 bg-white px-3 py-2">
						<p class="mb-1 text-xs font-black text-slate-500 uppercase">스킬 URL</p>
						<div class="flex items-center gap-2">
							<code class="flex-1 break-all font-mono text-xs text-violet-700">https://shot.epsilondelta.ai/skill.md</code>
							<button
								class="material-symbols-outlined shrink-0 text-slate-400 hover:text-slate-700"
								title="복사"
								onclick={() => navigator.clipboard.writeText('https://shot.epsilondelta.ai/skill.md')}
							>content_copy</button>
						</div>
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
