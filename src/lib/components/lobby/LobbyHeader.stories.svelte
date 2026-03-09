<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import LobbyHeader from './LobbyHeader.svelte';

	const { Story } = defineMeta({
		title: 'Lobby/LobbyHeader',
		component: LobbyHeader,
		tags: ['autodocs'],
		parameters: {
			layout: 'fullscreen'
		},
		argTypes: {
			username: { control: 'text' },
			level: { control: 'number' },
			avatarSrc: { control: 'text' }
		}
	});
</script>

<Story name="Default" args={{ username: 'Sheriff_Buck', level: 42 }} />

<Story name="With Avatar" args={{ username: 'Bandit_Jane', level: 15, avatarSrc: '' }} />
