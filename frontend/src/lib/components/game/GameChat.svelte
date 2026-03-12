<script lang="ts">
	import { m } from '$lib/paraglide/messages';

	type ChatMessage = {
		id: string;
		playerId: string;
		playerName: string;
		text: string;
	};

	let {
		messages = [],
		myId,
		isOpen = false,
		inline = false,
		canSend = true,
		ontoggle,
		onsend
	}: {
		messages?: ChatMessage[];
		myId: string;
		isOpen?: boolean;
		inline?: boolean;
		canSend?: boolean;
		ontoggle?: () => void;
		onsend?: (text: string) => void;
	} = $props();

	let inputText = $state('');

	function handleSend() {
		const text = inputText.trim();
		if (!text || !canSend) return;
		onsend?.(text);
		inputText = '';
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	}

	function scrollToBottom(node: HTMLDivElement) {
		$effect(() => {
			if (messages.length) {
				node.scrollTop = node.scrollHeight;
			}
		});
	}
</script>

{#if inline}
	<!-- Inline panel for desktop sidebar -->
	<div class="flex flex-1 flex-col overflow-hidden">
		<!-- Header -->
		<div class="flex items-center gap-2 border-b-2 border-slate-700 bg-slate-900 px-4 py-3">
			<span class="material-symbols-outlined text-sm text-slate-300">chat</span>
			<span class="text-xs font-black tracking-widest text-white uppercase">{m.game_chat()}</span>
		</div>

		<!-- Messages -->
		<div use:scrollToBottom class="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
			{#each messages as msg (msg.id)}
				<div class="flex flex-col {msg.playerId === myId ? 'items-end' : 'items-start'}">
					{#if msg.playerId !== myId}
						<span class="mb-0.5 text-[10px] font-black text-slate-400">{msg.playerName}</span>
					{/if}
					<div
						class="max-w-[75%] rounded-2xl px-3 py-2 text-sm font-bold
						{msg.playerId === myId
							? 'rounded-br-sm bg-primary text-white'
							: 'rounded-bl-sm bg-slate-700 text-slate-100'}"
					>
						{msg.text}
					</div>
				</div>
			{/each}
		</div>

		<!-- Input -->
		<div class="flex gap-2 border-t-2 border-slate-700 p-3">
			<input
				class="min-w-0 flex-1 rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm font-bold text-white placeholder:text-slate-500 focus:outline-none"
				type="text"
				placeholder={canSend ? m.game_chat_placeholder() : 'No chat available right now'}
				bind:value={inputText}
				disabled={!canSend}
				onkeydown={handleKeydown}
			/>
			<button
				class="comic-button shrink-0 rounded-xl border-2 border-slate-900 bg-primary px-4 py-2 text-xs font-black text-white uppercase disabled:opacity-40"
				disabled={!canSend || !inputText.trim()}
				onclick={handleSend}
			>
				{m.game_chat_send()}
			</button>
		</div>
	</div>
{:else}
	<!-- FAB Toggle Button (좌측 하단) -->
	<button
		class="comic-button fixed bottom-6 left-4 z-40 flex items-center justify-center gap-2 rounded-full border-2 border-slate-900 bg-slate-700 px-4 py-4 shadow-lg transition-colors hover:bg-slate-600"
		onclick={ontoggle}
		title={isOpen ? m.game_chat() : m.game_chat()}
	>
		<span class="material-symbols-outlined text-xl text-white">chat</span>
	</button>

	<!-- Background Overlay -->
	{#if isOpen}
		<div
			class="fixed inset-0 z-30 bg-black/40 transition-opacity duration-300"
			role="presentation"
			onclick={ontoggle}
			onkeydown={(e) => e.key === 'Escape' && ontoggle?.()}
		></div>
	{/if}

	<!-- Bottom Sheet -->
	<div
		class="comic-border fixed inset-x-0 bottom-0 z-30 flex max-h-[60vh] flex-col rounded-t-2xl bg-white transition-transform duration-300"
		style="transform: translateY({isOpen ? '0%' : '100%'})"
	>
		<!-- Header -->
		<div
			class="flex items-center justify-between gap-2 rounded-t-2xl border-b-2 border-slate-900 bg-background-dark px-4 py-3"
		>
			<div class="flex items-center gap-2">
				<span class="material-symbols-outlined text-sm text-slate-300">chat</span>
				<span class="text-xs font-black tracking-widest text-white uppercase"
					>{m.game_chat()}</span
				>
			</div>
			<button
				class="material-symbols-outlined text-xl text-white transition-colors hover:text-slate-300"
				onclick={ontoggle}
			>
				expand_more
			</button>
		</div>

		<!-- Messages -->
		<div use:scrollToBottom class="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
			{#each messages as msg (msg.id)}
				<div class="flex flex-col {msg.playerId === myId ? 'items-end' : 'items-start'}">
					{#if msg.playerId !== myId}
						<span class="mb-0.5 text-[10px] font-black text-slate-400">{msg.playerName}</span>
					{/if}
					<div
						class="max-w-[75%] rounded-2xl px-3 py-2 text-sm font-bold
						{msg.playerId === myId
							? 'rounded-br-sm bg-primary text-white'
							: 'rounded-bl-sm bg-slate-100 text-slate-800'}"
					>
						{msg.text}
					</div>
				</div>
			{/each}
		</div>

		<!-- Input -->
		<div class="flex gap-2 border-t-2 border-slate-200 p-3">
			<input
				class="comic-border-sm min-w-0 flex-1 rounded-xl px-3 py-2 text-sm font-bold placeholder:text-slate-400 focus:outline-none"
				type="text"
				placeholder={canSend ? m.game_chat_placeholder() : 'No chat available right now'}
				bind:value={inputText}
				disabled={!canSend}
				onkeydown={handleKeydown}
			/>
			<button
				class="comic-button shrink-0 rounded-xl border-2 border-slate-900 bg-primary px-4 py-2 text-xs font-black text-white uppercase disabled:opacity-40"
				disabled={!canSend || !inputText.trim()}
				onclick={handleSend}
			>
				{m.game_chat_send()}
			</button>
		</div>
	</div>
{/if}
