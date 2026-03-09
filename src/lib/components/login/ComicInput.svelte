<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	interface Props extends HTMLInputAttributes {
		label: string;
		icon?: string;
		onIconClick?: () => void;
		trailing?: import('svelte').Snippet;
	}

	let { label, icon, onIconClick, trailing, ...rest }: Props = $props();
</script>

<div class="space-y-2">
	<div class="ml-1 flex items-center justify-between">
		<!-- svelte-ignore a11y_label_has_associated_control -->
		<label class="text-sm font-black tracking-wider uppercase">{label}</label>
		{#if trailing}
			{@render trailing()}
		{/if}
	</div>
	<div class="relative">
		<input
			class="comic-border-sm w-full rounded-lg bg-stone-50 px-4 py-4 font-bold placeholder:text-stone-400 focus:ring-0 focus:outline-none"
			{...rest}
		/>
		{#if icon}
			{#if onIconClick}
				<button
					type="button"
					class="absolute top-1/2 right-4 flex -translate-y-1/2 cursor-pointer items-center justify-center"
					onclick={onIconClick}
				>
					<span class="material-symbols-outlined leading-none text-stone-400">{icon}</span>
				</button>
			{:else}
				<span
					class="material-symbols-outlined absolute top-1/2 right-4 -translate-y-1/2 text-stone-400"
				>
					{icon}
				</span>
			{/if}
		{/if}
	</div>
</div>
