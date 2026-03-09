<script lang="ts">
	import { m } from '$lib/paraglide/messages';

	let {
		logs
	}: {
		logs: { id: string; text: string; type: 'shot' | 'eliminated' | 'round' | 'result' }[];
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

<div class="comic-border rounded-xl bg-white">
	<div
		class="flex items-center gap-2 border-b-2 border-slate-900 bg-background-dark px-4 py-2 rounded-t-lg"
	>
		<span class="material-symbols-outlined text-sm text-primary">menu_book</span>
		<span class="text-xs font-black tracking-widest text-white uppercase"
			>{m.game_action_log()}</span
		>
	</div>
	<div use:scrollToBottom class="flex h-36 flex-col gap-1.5 overflow-y-auto p-3">
		{#each logs as log (log.id)}
			<div class="flex items-start gap-2 text-sm {typeStyles[log.type]}">
				<span class="material-symbols-outlined mt-0.5 text-sm">{typeIcons[log.type]}</span>
				<span class="font-bold">{log.text}</span>
			</div>
		{/each}
	</div>
</div>
