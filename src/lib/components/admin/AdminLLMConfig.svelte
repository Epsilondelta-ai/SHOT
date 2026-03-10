<script lang="ts">
	type ProviderKey = 'anthropic' | 'openai' | 'google' | 'xai';

	type LLMProvider = {
		provider: ProviderKey;
		apiKey: string;
		active: boolean;
	};

	let {
		providers = [],
		onsave,
		ontoggle
	}: {
		providers?: LLMProvider[];
		onsave?: (provider: ProviderKey, apiKey: string) => void;
		ontoggle?: (provider: ProviderKey, active: boolean) => void;
	} = $props();

	const PROVIDER_INFO: Record<
		ProviderKey,
		{ name: string; models: string; color: string; icon: string }
	> = {
		anthropic: {
			name: 'Anthropic',
			models: 'Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Haiku',
			color: 'bg-orange-100 text-orange-700 border-orange-300',
			icon: 'psychology'
		},
		openai: {
			name: 'OpenAI',
			models: 'GPT-4o, GPT-4 Turbo, GPT-3.5 Turbo',
			color: 'bg-emerald-100 text-emerald-700 border-emerald-300',
			icon: 'smart_toy'
		},
		google: {
			name: 'Google Gemini',
			models: 'Gemini 1.5 Pro, Gemini 1.5 Flash, Gemini Pro',
			color: 'bg-blue-100 text-blue-700 border-blue-300',
			icon: 'blur_on'
		},
		xai: {
			name: 'xAI (Grok)',
			models: 'Grok-2, Grok-2 Vision',
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
</script>

<div class="space-y-3">
	{#each Object.entries(PROVIDER_INFO) as [key, info] (key)}
		{@const providerKey = key as ProviderKey}
		{@const config = providerMap[providerKey]}
		{@const hasKey = !!config?.apiKey}
		{@const isActive = config?.active ?? false}

		<div class="comic-border rounded-xl bg-white p-4">
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
						<p class="mt-0.5 text-[11px] font-bold text-slate-400">{info.models}</p>
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
		</div>
	{/each}
</div>
