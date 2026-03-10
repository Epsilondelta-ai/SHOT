<script lang="ts">
	import favicon from '$lib/assets/favicon.png';

	let { title = 'SHOT!', subtitle = '' }: { title?: string; subtitle?: string } = $props();
</script>

<header class="space-y-2 text-center">
	<div class="mb-2 inline-flex items-center justify-center rounded-full bg-primary/10 p-3">
		<img src={favicon} alt="SHOT logo" class="size-10" />
	</div>
	<h1 class="text-5xl font-extrabold tracking-tighter text-slate-900 uppercase italic">
		{title}
	</h1>
	<p class="text-sm font-bold tracking-wide text-slate-600 uppercase">
		{subtitle}
	</p>
</header>
