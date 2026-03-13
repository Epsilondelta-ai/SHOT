<script lang="ts">
	import { m } from '$lib/paraglide/messages';

	type Bot = {
		id: string;
		name: string;
		active: boolean;
		pairingStatus: 'unpaired' | 'pairing' | 'paired' | 'error';
		presenceStatus: 'online' | 'offline';
		created: string | null;
		updated: string | null;
		lastSeenAt: string | null;
		pairingCodeExpiresAt: string | null;
		connectorName: string | null;
		connectorVersion?: string | null;
		deviceId?: string | null;
		busy?: boolean;
	};

	let {
		bots = [],
		pairingCodes = {},
		onedit,
		ondelete,
		onpairstart,
		onpaircancel
	}: {
		bots?: Bot[];
		pairingCodes?: Record<string, { code: string; expiresAt: string } | undefined>;
		onedit?: (bot: Bot) => void;
		ondelete?: (botId: string) => void;
		onpairstart?: (botId: string) => Promise<void> | void;
		onpaircancel?: (botId: string) => Promise<void> | void;
	} = $props();

	function presenceLabel(bot: Bot) {
		if (bot.pairingStatus === 'pairing') return '페어링 대기';
		if (bot.pairingStatus === 'unpaired') return '미페어링';
		if (bot.pairingStatus === 'error') return '오류';
		return bot.presenceStatus === 'online' ? '온라인' : '오프라인';
	}

	function presenceClass(bot: Bot) {
		if (bot.pairingStatus === 'paired' && bot.presenceStatus === 'online') {
			return 'bg-green-100 text-green-700';
		}
		if (bot.pairingStatus === 'pairing') {
			return 'bg-yellow-100 text-yellow-700';
		}
		if (bot.pairingStatus === 'error') {
			return 'bg-red-100 text-red-700';
		}
		return 'bg-slate-100 text-slate-600';
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
				<div class="mb-3 flex items-start justify-between gap-3">
					<div class="flex-1">
						<h3 class="font-black text-slate-900 uppercase">{bot.name}</h3>
						<div class="mt-2 flex flex-wrap gap-2">
							<span class={`rounded-full px-2 py-1 text-xs font-black uppercase ${presenceClass(bot)}`}>
								{presenceLabel(bot)}
							</span>
							{#if bot.active}
								<span class="rounded-full bg-blue-100 px-2 py-1 text-xs font-black text-blue-700 uppercase">
									{m.config_bot_active()}
								</span>
							{:else}
								<span class="rounded-full bg-gray-100 px-2 py-1 text-xs font-black text-gray-700 uppercase">
									{m.config_bot_inactive()}
								</span>
							{/if}
							{#if bot.busy}
								<span class="rounded-full bg-orange-100 px-2 py-1 text-xs font-black text-orange-700 uppercase">
									in room
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

				<div class="rounded-lg bg-slate-50 p-3 text-xs font-bold text-slate-600">
					<p>Provider: OpenClaw</p>
					<p>Connector: {bot.connectorName ?? '미연결'}</p>
					<p>Last seen: {bot.lastSeenAt ?? '기록 없음'}</p>
					{#if bot.deviceId}
						<p>Device: {bot.deviceId}</p>
					{/if}
				</div>

				{#if pairingCodes[bot.id]}
					<div class="mt-3 rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3">
						<p class="text-[11px] font-black tracking-wider text-slate-500 uppercase">pairing code</p>
						<p class="mt-1 font-mono text-lg font-black text-primary">
							{pairingCodes[bot.id]?.code}
						</p>
						<p class="mt-1 text-xs font-bold text-slate-500">
							만료: {pairingCodes[bot.id]?.expiresAt}
						</p>
					</div>
				{/if}

				<div class="mt-3 flex flex-wrap gap-2">
					<button
						type="button"
						class="comic-button rounded-xl border-2 border-slate-900 bg-primary px-3 py-2 text-[11px] font-black text-white uppercase"
						onclick={() => onpairstart?.(bot.id)}
					>
						{bot.pairingStatus === 'paired' ? '재페어링 코드 발급' : '페어링 시작'}
					</button>
					{#if bot.pairingStatus === 'pairing'}
						<button
							type="button"
							class="comic-button rounded-xl border-2 border-slate-900 bg-white px-3 py-2 text-[11px] font-black text-slate-700 uppercase"
							onclick={() => onpaircancel?.(bot.id)}
						>
							페어링 취소
						</button>
					{/if}
				</div>

				<div class="mt-3 border-t border-slate-200 pt-2 text-xs text-slate-500">
					<p>생성: {bot.created ?? '-'} | 수정: {bot.updated ?? '-'}</p>
				</div>
			</div>
		{/each}
	{/if}
</div>
