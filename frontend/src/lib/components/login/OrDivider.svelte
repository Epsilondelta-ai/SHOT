<script lang="ts">
	let { text = 'OR' }: { text?: string } = $props();
</script>

<div class="relative flex items-center py-2">
	<div class="grow border-t-2 border-dashed border-stone-300"></div>
	<span class="mx-4 shrink text-xs font-bold text-stone-400 uppercase">{text}</span>
	<div class="grow border-t-2 border-dashed border-stone-300"></div>
</div>
