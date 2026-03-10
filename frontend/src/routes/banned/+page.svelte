<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { enhance } from '$app/forms';

	let { data } = $props();
</script>

<svelte:head>
	<title>{m.banned_title()} - SHOT!</title>
</svelte:head>

<div
	class="flex min-h-screen flex-col items-center justify-center bg-background-light p-4 font-display"
>
	<div class="w-full max-w-md">
		<!-- Logo -->
		<h1
			class="mb-8 text-center text-5xl font-extrabold tracking-tighter text-primary uppercase italic"
			style="text-shadow: 3px 3px 0px #221910;"
		>
			SHOT!
		</h1>

		<!-- Ban Card -->
		<div class="comic-border rounded-2xl bg-white p-6">
			<div class="mb-4 flex items-center gap-3">
				<div
					class="flex size-14 items-center justify-center rounded-full border-3 border-red-500 bg-red-100"
				>
					<span class="material-symbols-outlined text-3xl text-red-500">block</span>
				</div>
				<div>
					<h2 class="text-lg font-black text-slate-900 uppercase">{m.banned_title()}</h2>
					<p class="text-sm text-slate-500">{m.banned_description()}</p>
				</div>
			</div>

			<div class="space-y-3 rounded-xl bg-slate-50 p-4">
				<!-- Reason -->
				<div>
					<p class="text-xs font-black tracking-wider text-slate-400 uppercase">
						{m.banned_reason_label()}
					</p>
					<p class="mt-1 text-sm font-bold text-slate-800">{data.banReason}</p>
				</div>

				<!-- Period -->
				<div class="border-t border-slate-200 pt-3">
					<p class="text-xs font-black tracking-wider text-slate-400 uppercase">
						{m.banned_period_label()}
					</p>
					<p class="mt-1 text-sm font-bold text-slate-800">
						{data.banStart ?? '?'} ~ {data.banEnd}
					</p>
				</div>

				<!-- Ban End -->
				<div class="border-t border-slate-200 pt-3">
					<p class="text-xs font-black tracking-wider text-slate-400 uppercase">
						{m.banned_end_label()}
					</p>
					<p class="mt-1 text-lg font-black text-red-600">{data.banEnd}</p>
				</div>
			</div>

			<form method="POST" action="?/signout" use:enhance class="mt-6">
				<button
					type="submit"
					class="comic-button w-full rounded-xl border-3 border-slate-900 bg-slate-800 py-3 font-black text-white uppercase"
				>
					<span class="material-symbols-outlined mr-1 align-middle text-sm">logout</span>
					{m.banned_logout()}
				</button>
			</form>
		</div>
	</div>
</div>
