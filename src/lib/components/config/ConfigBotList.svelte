<script lang="ts">
	import { m } from '$lib/paraglide/messages';

	type Bot = {
		id: string;
		name: string;
		apiKey: string;
		webhookUrl: string;
		active: boolean;
		created: string;
		updated: string;
	};

	let { bots = [], onedit, ondelete }: { bots?: Bot[]; onedit?: (bot: Bot) => void; ondelete?: (botId: string) => void } = $props();

	let expandedId: string | null = $state(null);

	function maskApiKey(apiKey: string): string {
		if (apiKey.length <= 8) return '•'.repeat(apiKey.length);
		return apiKey.slice(0, 3) + '•'.repeat(apiKey.length - 7) + apiKey.slice(-4);
	}
</script>

<div class="space-y-3">
	{#if bots.length === 0}
		<div class="comic-border rounded-lg border-2 border-slate-900 bg-slate-100 p-6 text-center">
			<div class="mb-2 flex justify-center">
				<span class="material-symbols-outlined text-4xl text-slate-400">smart_toy</span>
			</div>
			<p class="text-sm font-bold text-slate-600 uppercase">{m.config_bot_empty()}</p>
		</div>
	{:else}
		{#each bots as bot (bot.id)}
			<div class="comic-border rounded-lg border-2 border-slate-900 bg-white p-4">
				<div class="mb-3 flex items-start justify-between">
					<div class="flex-1">
						<h3 class="font-black uppercase text-slate-900">{bot.name}</h3>
						<div class="mt-1 flex gap-2">
							{#if bot.active}
								<span class="rounded-full bg-green-100 px-2 py-1 text-xs font-black uppercase text-green-700">
									{m.config_bot_active()}
								</span>
							{:else}
								<span class="rounded-full bg-gray-100 px-2 py-1 text-xs font-black uppercase text-gray-700">
									{m.config_bot_inactive()}
								</span>
							{/if}
						</div>
					</div>
					<div class="flex gap-2">
						<button
							class="material-symbols-outlined rounded-lg border-2 border-slate-900 bg-slate-200 p-2 hover:bg-slate-300"
							title="Edit"
							onclick={() => onedit?.(bot)}
						>
							edit
						</button>
						<button
							class="material-symbols-outlined rounded-lg border-2 border-slate-900 bg-red-100 p-2 text-red-700 hover:bg-red-200"
							title="Delete"
							onclick={() => ondelete?.(bot.id)}
						>
							delete
						</button>
					</div>
				</div>

				<!-- API Key Section -->
				<div class="mb-2 space-y-1 text-sm">
					<p class="text-xs font-black uppercase text-slate-500">{m.config_bot_api_key()}</p>
					<p class="font-mono text-sm font-bold text-slate-700">{maskApiKey(bot.apiKey)}</p>
				</div>

				<!-- Webhook URL Section (if present) -->
				{#if bot.webhookUrl}
					<div class="mb-2 space-y-1 text-sm">
						<p class="text-xs font-black uppercase text-slate-500">{m.config_bot_webhook_url()}</p>
						<button
							class="break-all text-left font-mono text-xs text-blue-600 hover:underline"
							onclick={() => (expandedId = expandedId === bot.id ? null : bot.id)}
						>
							{#if expandedId === bot.id}
								{bot.webhookUrl}
								<span class="material-symbols-outlined text-sm">unfold_less</span>
							{:else}
								{bot.webhookUrl.slice(0, 30)}...
								<span class="material-symbols-outlined text-sm">unfold_more</span>
							{/if}
						</button>
					</div>
				{/if}

				<!-- Metadata -->
				<div class="mt-3 border-t border-slate-200 pt-2 text-xs text-slate-500">
					<p>생성: {bot.created} | 수정: {bot.updated}</p>
				</div>
			</div>
		{/each}
	{/if}
</div>
