<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import BottomNav from './BottomNav.svelte';

	const { Story } = defineMeta({
		title: 'Lobby/BottomNav',
		component: BottomNav,
		tags: ['autodocs'],
		parameters: {
			layout: 'fullscreen'
		},
		argTypes: {
			active: {
				control: { type: 'select' },
				options: ['lobby', 'friends', 'shop', 'config']
			}
		}
	});
</script>

<Story name="Lobbies Active" args={{ active: 'lobby' }} />

<Story name="Friends Active" args={{ active: 'friends' }} />

<Story name="Shop Active" args={{ active: 'shop' }} />

<Story name="Config Active" args={{ active: 'config' }} />
