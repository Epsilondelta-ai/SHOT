<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	type NavItem = { icon: string; label: () => string; href: string };

	let { active = 'lobbies' }: { active?: string } = $props();

	const items: NavItem[] = [
		{ icon: 'sports_esports', label: () => m.nav_lobbies(), href: '/lobby' },
		{ icon: 'group', label: () => m.nav_friends(), href: '/friends' },
		{ icon: 'shopping_bag', label: () => m.nav_shop(), href: '/shop' },
		{ icon: 'settings', label: () => m.nav_config(), href: '/config' }
	];
</script>

<nav class="fixed bottom-0 left-0 right-0 z-50 border-t-4 border-slate-900 bg-white px-4 pb-6 pt-2">
	<div class="mx-auto flex max-w-2xl items-center justify-around">
		{#each items as item}
			<a
				href={item.href}
				class="group flex flex-col items-center gap-1 transition-colors
					{active === item.href.slice(1) ? 'text-primary' : 'text-slate-400 hover:text-primary'}"
			>
				<span class="material-symbols-outlined text-3xl font-bold">{item.icon}</span>
				<span class="text-[10px] font-black uppercase tracking-widest">{item.label()}</span>
			</a>
		{/each}
	</div>
</nav>
