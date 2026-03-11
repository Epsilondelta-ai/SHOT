<script lang="ts">
	import { m } from '$lib/paraglide/messages';

	let {
		messages,
		onsend,
		canSend = true
	}: {
		messages: { id: string; sender: string; text: string; isSystem?: boolean }[];
		onsend?: (text: string) => void;
		canSend?: boolean;
	} = $props();

	let inputText = $state('');

	function scrollToBottom(node: HTMLDivElement) {
		$effect(() => {
			if (messages.length) {
				node.scrollTop = node.scrollHeight;
			}
		});
	}

	function handleSend() {
		if (!canSend) return;
		const trimmed = inputText.trim();
		if (!trimmed) return;
		onsend?.(trimmed);
		inputText = '';
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	}
</script>

<div class="comic-border flex flex-col rounded-xl bg-white">
	<div use:scrollToBottom class="flex h-48 flex-col gap-2 overflow-y-auto p-3">
		{#each messages as msg (msg.id)}
			{#if msg.isSystem}
				<div class="text-center text-xs font-bold text-slate-400 italic">
					{msg.text}
				</div>
			{:else}
				<div class="text-sm">
					<span class="font-black text-primary">{msg.sender}:</span>
					<span class="font-medium text-slate-700">{msg.text}</span>
				</div>
			{/if}
		{/each}
	</div>

	<div class="flex border-t-2 border-slate-900">
		<input
			class="flex-1 border-none bg-transparent px-4 py-3 text-sm font-bold placeholder:text-slate-400 focus:ring-0"
			placeholder={m.room_chat_placeholder()}
			type="text"
			bind:value={inputText}
			disabled={!canSend}
			onkeydown={handleKeydown}
		/>
		<button
			class="comic-button border-l-2 border-slate-900 bg-primary px-5 py-3 font-black text-white uppercase disabled:opacity-40"
			disabled={!canSend || !inputText.trim()}
			onclick={handleSend}
		>
			<span class="material-symbols-outlined text-lg">send</span>
		</button>
	</div>
</div>
