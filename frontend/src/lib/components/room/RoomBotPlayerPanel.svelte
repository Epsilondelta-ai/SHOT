<script lang="ts">
	type BotOption = {
		id: string;
		name: string;
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

	async function submit() {
		if (!selectedBotId || isSubmitting || disabled) {
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
			<p class="text-xs font-bold text-slate-400">활성화된 봇을 골라 방에 추가합니다.</p>
		</div>
	</div>

	{#if bots.length === 0}
		<p class="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500">
			사용 가능한 OpenClaw 봇이 없습니다. 설정 페이지에서 봇을 먼저 추가하세요.
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
						<option value={bot.id}>{bot.name}</option>
					{/each}
				</select>
			</label>
		</div>

		<div class="mt-4 flex justify-end">
			<button
				type="button"
				class="comic-button flex items-center gap-2 rounded-xl border-3 border-slate-900 bg-slate-800 px-4 py-3 font-black text-white uppercase disabled:cursor-not-allowed disabled:opacity-50"
				disabled={disabled || isSubmitting || !selectedBotId}
				onclick={submit}
			>
				<span class="material-symbols-outlined text-lg">person_add</span>
				{isSubmitting ? '추가 중...' : 'OpenClaw Bot 추가'}
			</button>
		</div>
	{/if}
</section>
