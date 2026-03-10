<script lang="ts">
	import { m } from '$lib/paraglide/messages';

	let {
		isOpen = false,
		onsave,
		oncancel
	}: {
		isOpen?: boolean;
		onsave?: (data: { startAt: string; endAt: string; reason: string }) => void;
		oncancel?: () => void;
	} = $props();

	const today = new Date().toISOString().split('T')[0];
	const defaultEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

	let startAt = $state(today);
	let endAt = $state(defaultEnd);
	let reason = $state('');

	function handleSubmit() {
		if (!endAt || !reason.trim()) return;
		onsave?.({ startAt, endAt, reason: reason.trim() });
	}
</script>

{#if isOpen}
	<!-- Backdrop -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
		role="dialog"
		aria-modal="true"
	>
		<div class="comic-border w-full max-w-md rounded-2xl bg-white p-6">
			<h2 class="mb-4 flex items-center gap-2 text-lg font-black text-slate-900 uppercase">
				<span class="material-symbols-outlined text-red-500">block</span>
				{m.admin_ban_modal_title()}
			</h2>

			<div class="space-y-4">
				<!-- Start Date -->
				<div>
					<label class="mb-1 block text-xs font-black text-slate-600 uppercase" for="ban-start">
						{m.admin_ban_start_date()}
					</label>
					<input
						id="ban-start"
						type="date"
						class="comic-border w-full rounded-lg px-3 py-2 text-sm font-bold focus:border-primary focus:outline-none"
						bind:value={startAt}
						max={endAt}
					/>
				</div>

				<!-- End Date -->
				<div>
					<label class="mb-1 block text-xs font-black text-slate-600 uppercase" for="ban-end">
						{m.admin_ban_end_date()} <span class="text-red-500">*</span>
					</label>
					<input
						id="ban-end"
						type="date"
						class="comic-border w-full rounded-lg px-3 py-2 text-sm font-bold focus:border-primary focus:outline-none"
						bind:value={endAt}
						min={startAt}
					/>
				</div>

				<!-- Reason -->
				<div>
					<label class="mb-1 block text-xs font-black text-slate-600 uppercase" for="ban-reason">
						{m.admin_ban_reason()} <span class="text-red-500">*</span>
					</label>
					<textarea
						id="ban-reason"
						class="comic-border w-full resize-none rounded-lg px-3 py-2 text-sm font-bold focus:border-primary focus:outline-none"
						rows="3"
						placeholder={m.admin_ban_reason_placeholder()}
						bind:value={reason}
					></textarea>
				</div>
			</div>

			<div class="mt-6 flex gap-3">
				<button
					class="comic-button flex-1 rounded-lg border-2 border-slate-900 bg-slate-200 px-4 py-2 text-sm font-black text-slate-700 uppercase"
					onclick={oncancel}
				>
					{m.admin_cancel()}
				</button>
				<button
					class="comic-button flex-1 rounded-lg border-2 border-slate-900 bg-red-500 px-4 py-2 text-sm font-black text-white uppercase disabled:cursor-not-allowed disabled:opacity-50"
					disabled={!endAt || !reason.trim()}
					onclick={handleSubmit}
				>
					{m.admin_ban_confirm()}
				</button>
			</div>
		</div>
	</div>
{/if}
