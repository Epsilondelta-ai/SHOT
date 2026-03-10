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
		onadd?: (payload: { assistantId: string; llmModelId: string }) => Promise<void> | void;
	} = $props();

	let selectedAssistantId = $state('');
	let selectedModelId = $state('');
	let isSubmitting = $state(false);

	const selectedAssistant = $derived(
		assistants.find((assistant) => assistant.id === selectedAssistantId) ?? null
	);

	async function submit() {
		if (!selectedAssistantId || !selectedModelId || isSubmitting || disabled) {
			return;
		}

		isSubmitting = true;
		try {
			await onadd?.({ assistantId: selectedAssistantId, llmModelId: selectedModelId });
			selectedAssistantId = '';
			selectedModelId = '';
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

	{#if llmModels.length === 0 || assistants.length === 0}
		<p class="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500">
			{llmModels.length === 0
				? '활성화된 LLM 모델이 없습니다. 관리자 페이지에서 모델을 먼저 설정하세요.'
				: '사용 가능한 어시스턴트 프롬프트가 없습니다. 설정 페이지에서 어시스턴트를 먼저 추가하세요.'}
		</p>
	{:else}
		<div class="mt-4 grid gap-3 sm:grid-cols-2">
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
					{#each assistants as assistant (assistant.id)}
						<option value={assistant.id}>
							{assistant.name} {assistant.scope === 'personal' ? '(내 설정)' : '(전역)'}
						</option>
					{/each}
				</select>
			</label>
		</div>

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
				disabled={disabled || isSubmitting || !selectedAssistantId || !selectedModelId}
				onclick={submit}
			>
				<span class="material-symbols-outlined text-lg">person_add</span>
				{isSubmitting ? '추가 중...' : 'LLM Player 추가'}
			</button>
		</div>
	{/if}
</section>
