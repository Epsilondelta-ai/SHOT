<script lang="ts">
	import * as m from '$lib/paraglide/messages';

	let {
		isOpen = false,
		onclose
	}: {
		isOpen?: boolean;
		onclose?: () => void;
	} = $props();

	const sections = [
		{ title: () => m.home_rules_s1_title(), body: () => m.home_rules_s1_body() },
		{ title: () => m.home_rules_s2_title(), body: () => m.home_rules_s2_body() },
		{ title: () => m.home_rules_s3_title(), body: () => m.home_rules_s3_body() },
		{ title: () => m.home_rules_s4_title(), body: () => m.home_rules_s4_body() },
		{ title: () => m.home_rules_s5_title(), body: () => m.home_rules_s5_body() },
		{ title: () => m.home_rules_s6_title(), body: () => m.home_rules_s6_body() }
	];

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			onclose?.();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
		onclick={(e) => {
			if (e.target === e.currentTarget) onclose?.();
		}}
		role="dialog"
		aria-modal="true"
		aria-labelledby="rules-modal-title"
	>
		<div class="comic-border relative w-full max-w-lg rounded-2xl bg-white p-6 mx-4">
			<!-- Header -->
			<div class="mb-4 flex items-center justify-between">
				<h2
					id="rules-modal-title"
					class="text-xl font-black uppercase tracking-wide text-slate-900"
				>
					{m.home_rules_title()}
				</h2>
				<button
					class="comic-button rounded-lg border-2 border-slate-300 bg-white px-3 py-1 text-xs font-black text-slate-600"
					onclick={onclose}
					aria-label={m.home_rules_close()}
				>
					{m.home_rules_close()}
				</button>
			</div>

			<!-- Scrollable content -->
			<div class="max-h-[60vh] overflow-y-auto space-y-4 pr-1">
				{#each sections as section, i}
					{#if i > 0}
						<hr class="border-slate-200" />
					{/if}
					<div>
						<h3 class="mb-1 text-sm font-black uppercase tracking-wide text-slate-800">
							{section.title()}
						</h3>
						<p class="whitespace-pre-line text-sm leading-relaxed font-bold text-slate-600">
							{section.body()}
						</p>
					</div>
				{/each}
			</div>
		</div>
	</div>
{/if}
