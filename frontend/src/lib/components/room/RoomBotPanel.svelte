<script lang="ts">
	type BotOption = {
		id: string;
		name: string;
		image: string | null;
		active: boolean;
	};

	let {
		bots = [],
		disabled = false,
		oninvite
	}: {
		bots?: BotOption[];
		disabled?: boolean;
		oninvite?: (botId: string) => Promise<void> | void;
	} = $props();

	let selectedBotId = $state('');
	let isSubmitting = $state(false);

	const activeBots = $derived(bots.filter((b) => b.active));
	const canSubmit = $derived(!!selectedBotId && !isSubmitting && !disabled);

	async function submit() {
		if (!canSubmit) return;
		isSubmitting = true;
		try {
			await oninvite?.(selectedBotId);
			selectedBotId = '';
		} finally {
			isSubmitting = false;
		}
	}
</script>

<section class="comic-border rounded-xl bg-white p-4">
	<div class="flex items-center gap-2">
		<span class="material-symbols-outlined text-primary">adb</span>
		<div>
			<h2 class="text-sm font-black tracking-wider text-slate-900 uppercase">Bot Player</h2>
			<p class="text-xs font-bold text-slate-400">외부 봇을 방에 초대합니다.</p>
		</div>
	</div>

	{#if activeBots.length === 0}
		<p class="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500">
			활성화된 봇이 없습니다. 설정 페이지에서 봇을 먼저 만들어 주세요.
		</p>
	{:else}
		<div class="mt-4 flex gap-3">
			<label class="flex-1 space-y-1">
				<span class="text-[11px] font-black tracking-wider text-slate-500 uppercase">봇 선택</span>
				<select
					class="comic-border-sm w-full rounded-lg bg-white px-3 py-2 text-sm font-bold text-slate-900"
					bind:value={selectedBotId}
				>
					<option value="">봇 선택</option>
					{#each activeBots as bot (bot.id)}
						<option value={bot.id}>{bot.name}</option>
					{/each}
				</select>
			</label>
		</div>

		<div class="mt-4 flex justify-end">
			<button
				type="button"
				class="comic-button flex items-center gap-2 rounded-xl border-3 border-slate-900 bg-primary px-4 py-3 font-black text-white uppercase disabled:cursor-not-allowed disabled:opacity-50"
				disabled={!canSubmit}
				onclick={submit}
			>
				<span class="material-symbols-outlined text-lg">adb</span>
				{isSubmitting ? '초대 중...' : '봇 초대'}
			</button>
		</div>
	{/if}
</section>
