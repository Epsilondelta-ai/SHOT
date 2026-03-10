<script lang="ts">
	type ProviderKey = 'anthropic' | 'openai' | 'google' | 'xai';

	type LLMProvider = {
		provider: ProviderKey;
		apiKey: string;
		active: boolean;
	};

	type LLMModel = {
		id: string;
		provider: ProviderKey;
		apiModelName: string;
		displayName: string;
		active: boolean;
	};

	let {
		providers = [],
		models = [],
		onsave,
		ontoggle,
		onaddmodel,
		onupdatemodel,
		ondeletemodel,
		ontogglemodel
	}: {
		providers?: LLMProvider[];
		models?: LLMModel[];
		onsave?: (provider: ProviderKey, apiKey: string) => void;
		ontoggle?: (provider: ProviderKey, active: boolean) => void;
		onaddmodel?: (provider: ProviderKey, apiModelName: string, displayName: string) => void;
		onupdatemodel?: (id: string, apiModelName: string, displayName: string) => void;
		ondeletemodel?: (id: string) => void;
		ontogglemodel?: (id: string, active: boolean) => void;
	} = $props();

	const PROVIDER_INFO: Record<ProviderKey, { name: string; color: string; icon: string }> = {
		anthropic: {
			name: 'Anthropic',
			color: 'bg-orange-100 text-orange-700 border-orange-300',
			icon: 'psychology'
		},
		openai: {
			name: 'OpenAI',
			color: 'bg-emerald-100 text-emerald-700 border-emerald-300',
			icon: 'smart_toy'
		},
		google: {
			name: 'Google Gemini',
			color: 'bg-blue-100 text-blue-700 border-blue-300',
			icon: 'blur_on'
		},
		xai: {
			name: 'xAI (Grok)',
			color: 'bg-slate-100 text-slate-700 border-slate-300',
			icon: 'auto_awesome'
		}
	};

	const providerMap = $derived(Object.fromEntries(providers.map((p) => [p.provider, p])));

	let apiKeyInputs = $state<Record<ProviderKey, string>>({
		anthropic: '',
		openai: '',
		google: '',
		xai: ''
	});

	// Model add/edit state per provider
	type ModelForm = { apiModelName: string; displayName: string };
	let addModelForms = $state<Record<ProviderKey, ModelForm>>({
		anthropic: { apiModelName: '', displayName: '' },
		openai: { apiModelName: '', displayName: '' },
		google: { apiModelName: '', displayName: '' },
		xai: { apiModelName: '', displayName: '' }
	});
	let showAddForm = $state<Record<ProviderKey, boolean>>({
		anthropic: false,
		openai: false,
		google: false,
		xai: false
	});
	let editingModelId = $state<string | null>(null);
	let editForm = $state<ModelForm>({ apiModelName: '', displayName: '' });
</script>

<div class="space-y-3">
	{#each Object.entries(PROVIDER_INFO) as [key, info] (key)}
		{@const providerKey = key as ProviderKey}
		{@const config = providerMap[providerKey]}
		{@const hasKey = !!config?.apiKey}
		{@const isActive = config?.active ?? false}
		{@const providerModels = models.filter((m) => m.provider === providerKey)}

		<div class="comic-border rounded-xl bg-white p-4">
			<!-- Provider header -->
			<div class="flex items-start justify-between gap-3">
				<div class="flex items-center gap-3">
					<div
						class="flex size-10 shrink-0 items-center justify-center rounded-full border-2 {info.color}"
					>
						<span class="material-symbols-outlined text-lg">{info.icon}</span>
					</div>
					<div>
						<div class="flex items-center gap-2">
							<span class="text-sm font-black text-slate-900">{info.name}</span>
							{#if hasKey && isActive}
								<span
									class="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-black text-green-600 uppercase"
								>
									활성
								</span>
							{:else if hasKey}
								<span
									class="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-400 uppercase"
								>
									비활성
								</span>
							{:else}
								<span
									class="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-600 uppercase"
								>
									미설정
								</span>
							{/if}
						</div>
					</div>
				</div>

				{#if hasKey}
					<button
						class="comic-button shrink-0 rounded-lg border-2 px-3 py-1.5 text-xs font-black uppercase
							{isActive
							? 'border-slate-300 bg-slate-100 text-slate-600'
							: 'border-green-400 bg-green-500 text-white'}"
						onclick={() => ontoggle?.(providerKey, !isActive)}
					>
						{isActive ? '비활성화' : '활성화'}
					</button>
				{/if}
			</div>

			<!-- API Key input -->
			<div class="mt-3 flex gap-2">
				<input
					class="comic-border-sm min-w-0 flex-1 rounded-lg bg-white px-3 py-2 text-sm font-bold placeholder:text-slate-400"
					type="password"
					placeholder={hasKey ? '••••••••••••••••••••' : 'API Key 입력'}
					bind:value={apiKeyInputs[providerKey]}
				/>
				<button
					class="comic-button shrink-0 rounded-lg border-2 border-slate-900 bg-primary px-4 py-2 text-xs font-black text-white uppercase disabled:opacity-40"
					disabled={!apiKeyInputs[providerKey].trim()}
					onclick={() => {
						onsave?.(providerKey, apiKeyInputs[providerKey]);
						apiKeyInputs[providerKey] = '';
					}}
				>
					저장
				</button>
			</div>

			<!-- Models section -->
			<div class="mt-4 border-t border-slate-100 pt-3">
				<div class="mb-2 flex items-center justify-between">
					<span class="text-[11px] font-black tracking-wider text-slate-400 uppercase">모델</span>
					<button
						class="flex items-center gap-1 text-[11px] font-black text-primary"
						onclick={() => (showAddForm[providerKey] = !showAddForm[providerKey])}
					>
						<span class="material-symbols-outlined text-sm">add</span>
						추가
					</button>
				</div>

				<!-- Add model form -->
				{#if showAddForm[providerKey]}
					<div class="mb-2 space-y-1.5 rounded-lg bg-slate-50 p-3">
						<input
							class="comic-border-sm w-full rounded-lg px-3 py-1.5 text-xs font-bold placeholder:text-slate-400"
							placeholder="API 모델명 (예: claude-opus-4-6)"
							bind:value={addModelForms[providerKey].apiModelName}
						/>
						<input
							class="comic-border-sm w-full rounded-lg px-3 py-1.5 text-xs font-bold placeholder:text-slate-400"
							placeholder="표시명 (예: Claude Opus 4.6)"
							bind:value={addModelForms[providerKey].displayName}
						/>
						<div class="flex gap-2">
							<button
								class="comic-button flex-1 rounded-lg border-2 border-slate-900 bg-primary px-3 py-1.5 text-xs font-black text-white disabled:opacity-40"
								disabled={!addModelForms[providerKey].apiModelName.trim() ||
									!addModelForms[providerKey].displayName.trim()}
								onclick={() => {
									onaddmodel?.(
										providerKey,
										addModelForms[providerKey].apiModelName,
										addModelForms[providerKey].displayName
									);
									addModelForms[providerKey] = { apiModelName: '', displayName: '' };
									showAddForm[providerKey] = false;
								}}
							>
								추가
							</button>
							<button
								class="comic-button rounded-lg border-2 border-slate-300 bg-white px-3 py-1.5 text-xs font-black text-slate-500"
								onclick={() => (showAddForm[providerKey] = false)}
							>
								취소
							</button>
						</div>
					</div>
				{/if}

				<!-- Model list -->
				{#if providerModels.length === 0}
					<p class="py-2 text-center text-[11px] font-bold text-slate-300">설정된 모델 없음</p>
				{:else}
					<div class="space-y-1">
						{#each providerModels as model (model.id)}
							{#if editingModelId === model.id}
								<div class="space-y-1.5 rounded-lg bg-slate-50 p-2">
									<input
										class="comic-border-sm w-full rounded-lg px-3 py-1.5 text-xs font-bold"
										bind:value={editForm.apiModelName}
									/>
									<input
										class="comic-border-sm w-full rounded-lg px-3 py-1.5 text-xs font-bold"
										bind:value={editForm.displayName}
									/>
									<div class="flex gap-2">
										<button
											class="comic-button flex-1 rounded-lg border-2 border-slate-900 bg-primary px-3 py-1 text-xs font-black text-white disabled:opacity-40"
											disabled={!editForm.apiModelName.trim() || !editForm.displayName.trim()}
											onclick={() => {
												onupdatemodel?.(model.id, editForm.apiModelName, editForm.displayName);
												editingModelId = null;
											}}
										>
											저장
										</button>
										<button
											class="comic-button rounded-lg border-2 border-slate-300 bg-white px-3 py-1 text-xs font-black text-slate-500"
											onclick={() => (editingModelId = null)}
										>
											취소
										</button>
									</div>
								</div>
							{:else}
								<div
									class="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 {model.active
										? 'bg-white'
										: 'bg-slate-50 opacity-60'}"
								>
									<div class="min-w-0 flex-1">
										<p class="text-xs font-black text-slate-800">{model.displayName}</p>
										<p class="text-[10px] font-bold text-slate-400">{model.apiModelName}</p>
									</div>
									<div class="flex shrink-0 items-center gap-1">
										<button
											class="flex size-6 items-center justify-center rounded text-slate-400 hover:bg-slate-100"
											onclick={() => {
												ontogglemodel?.(model.id, !model.active);
											}}
											title={model.active ? '비활성화' : '활성화'}
										>
											<span class="material-symbols-outlined text-sm">
												{model.active ? 'toggle_on' : 'toggle_off'}
											</span>
										</button>
										<button
											class="flex size-6 items-center justify-center rounded text-slate-400 hover:bg-slate-100"
											onclick={() => {
												editingModelId = model.id;
												editForm = {
													apiModelName: model.apiModelName,
													displayName: model.displayName
												};
											}}
										>
											<span class="material-symbols-outlined text-sm">edit</span>
										</button>
										<button
											class="flex size-6 items-center justify-center rounded text-red-400 hover:bg-red-50"
											onclick={() => ondeletemodel?.(model.id)}
										>
											<span class="material-symbols-outlined text-sm">delete</span>
										</button>
									</div>
								</div>
							{/if}
						{/each}
					</div>
				{/if}
			</div>
		</div>
	{/each}
</div>
