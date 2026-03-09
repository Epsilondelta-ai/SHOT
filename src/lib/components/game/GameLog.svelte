<script lang="ts">
	import { m } from '$lib/paraglide/messages';

	let {
		logs,
		isOpen = false,
		ontoggle
	}: {
		logs: { id: string; text: string; type: 'shot' | 'eliminated' | 'round' | 'result' }[];
		isOpen?: boolean;
		ontoggle?: () => void;
	} = $props();

	const typeStyles: Record<string, string> = {
		shot: 'text-slate-700',
		eliminated: 'text-red-600 font-black',
		round: 'text-primary font-black',
		result: 'text-yellow-600 font-black'
	};

	const typeIcons: Record<string, string> = {
		shot: 'local_fire_department',
		eliminated: 'skull',
		round: 'flag',
		result: 'emoji_events'
	};

	function scrollToBottom(node: HTMLDivElement) {
		$effect(() => {
			if (logs.length) {
				node.scrollTop = node.scrollHeight;
			}
		});
	}
</script>

<!-- FAB Toggle Button (우측 하단) -->
<button
	class="fixed bottom-6 right-4 z-40 comic-button flex items-center justify-center gap-2 rounded-full border-2 border-slate-900 bg-primary px-4 py-4 shadow-lg hover:bg-primary/90 transition-colors"
	onclick={ontoggle}
	title={isOpen ? '전투 기록 닫기' : '전투 기록 보기'}
>
	<span class="material-symbols-outlined text-xl text-white">
		{isOpen ? 'close' : 'menu_book'}
	</span>
</button>

<!-- Background Overlay (바텀 시트 열릴 때) -->
{#if isOpen}
	<div
		class="fixed inset-0 z-30 bg-black/40 transition-opacity duration-300"
		onclick={ontoggle}
	></div>
{/if}

<!-- Bottom Sheet -->
<div
	class="fixed inset-x-0 bottom-0 z-30 max-h-[60vh] bg-white comic-border rounded-t-2xl transition-transform duration-300"
	style="transform: translateY({isOpen ? '0%' : '100%'})"
>
	<!-- Header -->
	<div class="flex items-center justify-between gap-2 border-b-2 border-slate-900 bg-background-dark px-4 py-3 rounded-t-2xl">
		<div class="flex items-center gap-2">
			<span class="material-symbols-outlined text-sm text-primary">menu_book</span>
			<span class="text-xs font-black tracking-widest text-white uppercase"
				>{m.game_action_log()}</span
			>
		</div>
		<button
			class="material-symbols-outlined text-xl text-white hover:text-slate-300 transition-colors"
			onclick={ontoggle}
		>
			expand_more
		</button>
	</div>

	<!-- Scrollable Content -->
	<div use:scrollToBottom class="flex h-[calc(60vh-60px)] flex-col gap-1.5 overflow-y-auto p-3">
		{#each logs as log (log.id)}
			<div class="flex items-start gap-2 text-sm {typeStyles[log.type]}">
				<span class="material-symbols-outlined mt-0.5 text-sm">{typeIcons[log.type]}</span>
				<span class="font-bold">{log.text}</span>
			</div>
		{/each}
	</div>
</div>
