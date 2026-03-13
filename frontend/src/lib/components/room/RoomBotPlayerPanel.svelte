<script lang="ts">
	type BotOption = {
		id: string;
		name: string;
		pairingStatus: 'unpaired' | 'pairing' | 'paired' | 'error';
		presenceStatus: 'online' | 'offline';
		active: boolean;
		busy: boolean;
	};

	let {
		bots = [],
		disabled = false,
		onadd
	}: {
		bots?: BotOption[];
		disabled?: boolean;
		onadd?: (payload: { botId: string }) => Promise<void> | void;
	} = $props();

	let selectedBotId = $state('');
	let isSubmitting = $state(false);

	const selectedBot = $derived(bots.find((bot) => bot.id === selectedBotId) ?? null);
	const canInvite = $derived(
		!!selectedBot &&
		selectedBot.active &&
		selectedBot.pairingStatus === 'paired' &&
		selectedBot.presenceStatus === 'online' &&
		!selectedBot.busy
	);

	function describeBot(bot: BotOption) {
		if (!bot.active) return '비활성';
		if (bot.pairingStatus !== 'paired') return `상태: ${bot.pairingStatus}`;
		if (bot.presenceStatus !== 'online') return '오프라인';
		if (bot.busy) return '다른 방에서 사용 중';
		return '초대 가능';
	}

	async function submit() {
		if (!selectedBotId || isSubmitting || disabled || !canInvite) {
			return;
		}

		isSubmitting = true;
		try {
			await onadd?.({ botId: selectedBotId });
			selectedBotId = '';
		} finally {
			isSubmitting = false;
		}
	}
</script>

<section class="comic-border rounded-xl bg-white p-4">
	<div class="flex items-center gap-2">
		<span class="material-symbols-outlined text-primary">precision_manufacturing</span>
		<div>
			<h2 class="text-sm font-black tracking-wider text-slate-900 uppercase">OpenClaw Bot</h2>
			<p class="text-xs font-bold text-slate-400">내 봇 중 현재 온라인인 봇을 초대합니다.</p>
		</div>
	</div>

	{#if bots.length === 0}
		<p class="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500">
			사용 가능한 OpenClaw 봇이 없습니다. 설정 페이지에서 봇을 추가하고 페어링하세요.
		</p>
	{:else}
		<div class="mt-4 grid gap-3">
			<label class="space-y-1">
				<span class="text-[11px] font-black tracking-wider text-slate-500 uppercase">봇</span>
				<select
					class="comic-border-sm w-full rounded-lg bg-white px-3 py-2 text-sm font-bold text-slate-900"
					bind:value={selectedBotId}
				>
					<option value="">봇 선택</option>
					{#each bots as bot (bot.id)}
						<option value={bot.id}>
							{bot.name} — {describeBot(bot)}
						</option>
					{/each}
				</select>
			</label>

			{#if selectedBot}
				<div class="rounded-lg bg-slate-50 px-3 py-3 text-xs font-bold text-slate-600">
					{#if !selectedBot.active}
						비활성화된 봇입니다.
					{:else if selectedBot.pairingStatus !== 'paired'}
						먼저 설정 페이지에서 페어링을 완료하세요.
					{:else if selectedBot.presenceStatus !== 'online'}
						커넥터가 오프라인입니다. PC에서 OpenClaw 커넥터를 켜세요.
					{:else if selectedBot.busy}
						이 봇은 이미 다른 방에서 사용 중입니다.
					{:else}
						지금 바로 이 방에 초대할 수 있습니다.
					{/if}
				</div>
			{/if}
		</div>

		<div class="mt-4 flex justify-end">
			<button
				type="button"
				class="comic-button flex items-center gap-2 rounded-xl border-3 border-slate-900 bg-slate-800 px-4 py-3 font-black text-white uppercase disabled:cursor-not-allowed disabled:opacity-50"
				disabled={disabled || isSubmitting || !selectedBotId || !canInvite}
				onclick={submit}
			>
				<span class="material-symbols-outlined text-lg">person_add</span>
				{isSubmitting ? '추가 중...' : 'OpenClaw Bot 초대'}
			</button>
		</div>
	{/if}
</section>
