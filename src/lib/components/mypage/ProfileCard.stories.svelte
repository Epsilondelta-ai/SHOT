<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import ProfileCard from './ProfileCard.svelte';

	const { Story } = defineMeta({
		title: 'Mypage/ProfileCard',
		component: ProfileCard,
		tags: ['autodocs'],
		argTypes: {
			username: { control: 'text' },
			level: { control: 'number' },
			xp: { control: 'number' },
			maxXp: { control: 'number' },
			avatarSrc: { control: 'text' }
		}
	});
</script>

<Story
	name="Default"
	args={{
		username: 'Sheriff_Buck',
		level: 42,
		xp: 7800,
		maxXp: 10000
	}}
/>

<Story
	name="Low XP"
	args={{
		username: 'NewComer',
		level: 1,
		xp: 200,
		maxXp: 1000
	}}
/>

<Story
	name="Max XP"
	args={{
		username: 'Outlander',
		level: 99,
		xp: 10000,
		maxXp: 10000
	}}
/>

<Story
	name="With Avatar"
	args={{
		username: 'Bandit_King',
		level: 25,
		xp: 5000,
		maxXp: 8000,
		avatarSrc: 'https://picsum.photos/seed/bandit/200/200'
	}}
/>
