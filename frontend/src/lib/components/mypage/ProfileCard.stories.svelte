<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import ProfileCard from './ProfileCard.svelte';

	const { Story } = defineMeta({
		title: 'Mypage/ProfileCard',
		component: ProfileCard,
		tags: ['autodocs'],
		argTypes: {
			username: { control: 'text' },
			avatarSrc: { control: 'text' }
		}
	});
</script>

<Story name="Default" args={{ username: 'Sheriff_Buck' }} />

<Story
	name="With Avatar"
	args={{ username: 'Bandit_King', avatarSrc: 'https://picsum.photos/seed/bandit/200/200' }}
/>
