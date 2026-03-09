<script lang="ts">
	import type { HTMLButtonAttributes } from 'svelte/elements';

	interface Props extends HTMLButtonAttributes {
		variant?: 'primary' | 'secondary';
		icon?: string;
		children: import('svelte').Snippet;
	}

	let { variant = 'primary', icon, children, ...rest }: Props = $props();
</script>

<button
	class="comic-button flex w-full items-center justify-center gap-2 rounded-lg py-4 text-lg font-black tracking-widest uppercase
		{variant === 'primary'
		? 'comic-border bg-primary text-white'
		: 'comic-border-sm bg-white text-slate-900'}"
	{...rest}
>
	{@render children()}
	{#if icon}
		<span class="material-symbols-outlined">{icon}</span>
	{/if}
</button>
