<script lang="ts">
	type AssistantOption = {
		id: string;
		name: string;
		prompt: string;
		scope: 'personal' | 'global';
	};

	type ModelOption = {
		id: string;
		provider: 'anthropic' | 'openai' | 'google' | 'xai';
		apiModelName: string;
		displayName: string;
	};

	let {
		assistants = [],
		llmModels = [],
		disabled = false,
		onadd
	}: {
		assistants?: AssistantOption[];
		llmModels?: ModelOption[];
		disabled?: boolean;
		onadd?: (payload: { assistantId?: string; name?: string; llmModelId: string; language: string }) => Promise<void> | void;
	} = $props();

	let selectedAssistantId = $state('');
	let selectedModelId = $state('');
	let selectedLanguage = $state('English');
	let customName = $state('');
	let isSubmitting = $state(false);

	const noAssistant = $derived(selectedAssistantId === 'none');
	const selectedAssistant = $derived(
		assistants.find((assistant) => assistant.id === selectedAssistantId) ?? null
	);
	const canSubmit = $derived(
		!!selectedModelId &&
		!isSubmitting &&
		!disabled &&
		(noAssistant ? customName.trim().length > 0 : !!selectedAssistantId)
	);

	async function submit() {
		if (!canSubmit) return;

		isSubmitting = true;
		try {
			await onadd?.({
				assistantId: noAssistant ? undefined : selectedAssistantId,
				name: noAssistant ? customName.trim() : undefined,
				llmModelId: selectedModelId,
				language: selectedLanguage,
			});
			selectedAssistantId = '';
			selectedModelId = '';
			customName = '';
		} finally {
			isSubmitting = false;
		}
	}
</script>

<section class="comic-border rounded-xl bg-white p-4">
	<div class="flex items-center gap-2">
		<span class="material-symbols-outlined text-primary">smart_toy</span>
		<div>
			<h2 class="text-sm font-black tracking-wider text-slate-900 uppercase">LLM Player</h2>
			<p class="text-xs font-bold text-slate-400">모델과 어시스턴트 프롬프트를 골라 방에 추가합니다.</p>
		</div>
	</div>

	{#if llmModels.length === 0}
		<p class="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500">
			활성화된 LLM 모델이 없습니다. 관리자 페이지에서 모델을 먼저 설정하세요.
		</p>
	{:else}
		<div class="mt-4 grid gap-3 sm:grid-cols-3">
			<label class="space-y-1">
				<span class="text-[11px] font-black tracking-wider text-slate-500 uppercase">모델</span>
				<select
					class="comic-border-sm w-full rounded-lg bg-white px-3 py-2 text-sm font-bold text-slate-900"
					bind:value={selectedModelId}
				>
					<option value="">모델 선택</option>
					{#each llmModels as model (model.id)}
						<option value={model.id}>{model.displayName}</option>
					{/each}
				</select>
			</label>

			<label class="space-y-1">
				<span class="text-[11px] font-black tracking-wider text-slate-500 uppercase">
					어시스턴트 프롬프트
				</span>
				<select
					class="comic-border-sm w-full rounded-lg bg-white px-3 py-2 text-sm font-bold text-slate-900"
					bind:value={selectedAssistantId}
				>
					<option value="">어시스턴트 선택</option>
					<option value="none">없음 (이름 직접 입력)</option>
					{#each assistants as assistant (assistant.id)}
						<option value={assistant.id}>
							{assistant.name} {assistant.scope === 'personal' ? '(내 설정)' : '(전역)'}
						</option>
					{/each}
				</select>
			</label>

			<label class="space-y-1">
				<span class="text-[11px] font-black tracking-wider text-slate-500 uppercase">언어</span>
				<select
					class="comic-border-sm w-full rounded-lg bg-white px-3 py-2 text-sm font-bold text-slate-900"
					bind:value={selectedLanguage}
				>
					<option value="Korean">한국어</option>
					<option value="English">English</option>
					<option value="Japanese">日本語</option>
					<option value="Chinese">中文</option>
				</select>
			</label>
		</div>

		{#if noAssistant}
			<label class="mt-3 block space-y-1">
				<span class="text-[11px] font-black tracking-wider text-slate-500 uppercase">플레이어 이름</span>
				<input
					type="text"
					placeholder="이름을 입력하세요"
					class="comic-border-sm w-full rounded-lg bg-white px-3 py-2 text-sm font-bold text-slate-900"
					bind:value={customName}
				/>
			</label>
		{/if}

		{#if selectedAssistant}
			<div class="mt-3 rounded-lg bg-slate-50 p-3">
				<p class="text-[11px] font-black tracking-wider text-slate-500 uppercase">프롬프트 미리보기</p>
				<p class="mt-1 text-sm whitespace-pre-wrap text-slate-700">{selectedAssistant.prompt}</p>
			</div>
		{/if}

		<div class="mt-4 flex justify-end">
			<button
				type="button"
				class="comic-button flex items-center gap-2 rounded-xl border-3 border-slate-900 bg-primary px-4 py-3 font-black text-white uppercase disabled:cursor-not-allowed disabled:opacity-50"
				disabled={!canSubmit}
				onclick={submit}
			>
				<span class="material-symbols-outlined text-lg">person_add</span>
				{isSubmitting ? '추가 중...' : 'LLM Player 추가'}
			</button>
		</div>
	{/if}
</section>
