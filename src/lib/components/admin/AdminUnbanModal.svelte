<script lang="ts">
	import { m } from '$lib/paraglide/messages';

	let {
		isOpen = false,
		onsave,
		oncancel
	}: {
		isOpen?: boolean;
		onsave?: (reason: string) => void;
		oncancel?: () => void;
	} = $props();

	let reason = $state('');

	function handleSubmit() {
		if (!reason.trim()) return;
		onsave?.(reason.trim());
	}
</script>

{#if isOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
		role="dialog"
		aria-modal="true"
	>
		<div class="comic-border w-full max-w-md rounded-2xl bg-white p-6">
			<h2 class="mb-4 flex items-center gap-2 text-lg font-black text-slate-900 uppercase">
				<span class="material-symbols-outlined text-green-500">lock_open</span>
				{m.admin_unban_modal_title()}
			</h2>

			<div>
				<label class="mb-1 block text-xs font-black text-slate-600 uppercase" for="unban-reason">
					{m.admin_unban_reason()} <span class="text-red-500">*</span>
				</label>
				<textarea
					id="unban-reason"
					class="comic-border w-full resize-none rounded-lg px-3 py-2 text-sm font-bold focus:border-primary focus:outline-none"
					rows="3"
					placeholder={m.admin_unban_reason_placeholder()}
					bind:value={reason}
				></textarea>
			</div>

			<div class="mt-6 flex gap-3">
				<button
					class="comic-button flex-1 rounded-lg border-2 border-slate-900 bg-slate-200 px-4 py-2 text-sm font-black text-slate-700 uppercase"
					onclick={oncancel}
				>
					{m.admin_cancel()}
				</button>
				<button
					class="comic-button flex-1 rounded-lg border-2 border-slate-900 bg-green-500 px-4 py-2 text-sm font-black text-white uppercase disabled:cursor-not-allowed disabled:opacity-50"
					disabled={!reason.trim()}
					onclick={handleSubmit}
				>
					{m.admin_unban_confirm()}
				</button>
			</div>
		</div>
	</div>
{/if}
