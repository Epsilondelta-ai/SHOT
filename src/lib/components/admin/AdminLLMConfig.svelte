<script lang="ts">
	import { m } from '$lib/paraglide/messages';

	type Provider = {
		id: string;
		name: string;
		baseUrl: string;
		apiKey: string;
		active: boolean;
	};

	type Model = {
		id: string;
		providerId: string;
		name: string;
		contextWindow: number;
		costInput: number;
		costOutput: number;
		enabled: boolean;
	};

	let {
		providers = [],
		models = [],
		onprovideradd,
		onproviderdelete,
		onmodeltest,
		onmodeladd: _onmodeladd,
		onmodeldelete
	}: {
		providers?: Provider[];
		models?: Model[];
		onprovideradd?: (provider: Omit<Provider, 'id'>) => void;
		onproviderdelete?: (providerId: string) => void;
		onmodeltest?: (modelId: string) => void;
		onmodeladd?: (model: Omit<Model, 'id'>) => void;
		onmodeldelete?: (modelId: string) => void;
	} = $props();

	let activeSection: 'providers' | 'models' = $state('providers');
	let newProviderName = $state('');
	let newProviderBaseUrl = $state('');
	let newProviderApiKey = $state('');

	function addProvider() {
		if (!newProviderName.trim() || !newProviderBaseUrl.trim() || !newProviderApiKey.trim()) {
			return;
		}
		onprovideradd?.({
			name: newProviderName,
			baseUrl: newProviderBaseUrl,
			apiKey: newProviderApiKey,
			active: true
		});
		newProviderName = '';
		newProviderBaseUrl = '';
		newProviderApiKey = '';
	}
</script>

<div class="space-y-4">
	<!-- Section Tabs -->
	<div class="flex gap-2">
		<button
			class="flex-1 border-b-3 px-4 py-2 text-sm font-black uppercase transition-colors
				{activeSection === 'providers'
				? 'border-primary text-primary'
				: 'border-transparent text-slate-400'}"
			onclick={() => (activeSection = 'providers')}
		>
			{m.admin_provider()}
		</button>
		<button
			class="flex-1 border-b-3 px-4 py-2 text-sm font-black uppercase transition-colors
				{activeSection === 'models' ? 'border-primary text-primary' : 'border-transparent text-slate-400'}"
			onclick={() => (activeSection = 'models')}
		>
			{m.admin_model()}
		</button>
	</div>

	{#if activeSection === 'providers'}
		<div class="space-y-3">
			<!-- Add Provider Form -->
			<div class="comic-border rounded-xl bg-white p-4">
				<h3 class="mb-3 text-sm font-black text-slate-900 uppercase">{m.admin_add_provider()}</h3>
				<div class="space-y-2">
					<input
						class="comic-border-sm w-full rounded-lg bg-white px-3 py-2 text-sm font-bold placeholder:text-slate-400"
						placeholder={m.admin_provider_name()}
						type="text"
						bind:value={newProviderName}
					/>
					<input
						class="comic-border-sm w-full rounded-lg bg-white px-3 py-2 text-sm font-bold placeholder:text-slate-400"
						placeholder={m.admin_provider_base_url()}
						type="text"
						bind:value={newProviderBaseUrl}
					/>
					<input
						class="comic-border-sm w-full rounded-lg bg-white px-3 py-2 text-sm font-bold placeholder:text-slate-400"
						placeholder={m.admin_provider_api_key()}
						type="password"
						bind:value={newProviderApiKey}
					/>
					<button
						class="comic-button w-full rounded-lg border-2 border-slate-900 bg-primary px-4 py-2 font-black text-white uppercase"
						onclick={addProvider}
						disabled={!newProviderName.trim() ||
							!newProviderBaseUrl.trim() ||
							!newProviderApiKey.trim()}
					>
						{m.admin_add_provider()}
					</button>
				</div>
			</div>

			<!-- Provider List -->
			<div class="space-y-2">
				{#each providers as provider (provider.id)}
					<div class="comic-border flex items-center justify-between rounded-xl bg-white p-4">
						<div>
							<div class="flex items-center gap-2">
								<span class="text-sm font-black text-slate-900">{provider.name}</span>
								{#if provider.active}
									<span
										class="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-black text-green-600 uppercase"
									>
										{m.admin_provider_active()}
									</span>
								{:else}
									<span
										class="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-400 uppercase"
									>
										{m.admin_provider_inactive()}
									</span>
								{/if}
							</div>
							<p class="mt-0.5 text-[11px] font-bold text-slate-400">{provider.baseUrl}</p>
						</div>
						<button
							class="comic-button rounded-lg border-2 border-slate-900 bg-red-500 px-3 py-2 text-xs font-black text-white uppercase"
							onclick={() => onproviderdelete?.(provider.id)}
						>
							{m.admin_delete()}
						</button>
					</div>
				{/each}
			</div>
		</div>
	{:else if activeSection === 'models'}
		<div class="space-y-3">
			<!-- Model List -->
			{#each models as model (model.id)}
				{@const provider = providers.find((p) => p.id === model.providerId)}
				<div
					class="comic-border flex items-center justify-between rounded-xl bg-white p-4
					{!model.enabled ? 'opacity-60' : ''}"
				>
					<div class="flex-1">
						<div class="flex items-center gap-2">
							<span class="text-sm font-black text-slate-900">{model.name}</span>
							<span class="text-[10px] font-bold text-slate-400">{provider?.name}</span>
							{#if model.enabled}
								<span
									class="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-black text-green-600 uppercase"
								>
									{m.admin_model_enabled()}
								</span>
							{/if}
						</div>
						<div class="mt-1 flex flex-wrap gap-2 text-[10px] font-bold text-slate-500 uppercase">
							<span>{m.admin_model_context_window()}: {model.contextWindow.toLocaleString()}</span>
							<span>•</span>
							<span>{m.admin_model_cost_input()}: ${model.costInput.toFixed(2)}</span>
							<span>•</span>
							<span>{m.admin_model_cost_output()}: ${model.costOutput.toFixed(2)}</span>
						</div>
					</div>

					<div class="flex gap-2">
						<button
							class="comic-button rounded-lg border-2 border-slate-900 bg-blue-500 px-3 py-2 text-xs font-black text-white uppercase"
							onclick={() => onmodeltest?.(model.id)}
						>
							{m.admin_model_test()}
						</button>
						<button
							class="comic-button rounded-lg border-2 border-slate-900 bg-red-500 px-3 py-2 text-xs font-black text-white uppercase"
							onclick={() => onmodeldelete?.(model.id)}
						>
							{m.admin_delete()}
						</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
