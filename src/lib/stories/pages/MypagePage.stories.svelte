<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import MypagePage from '../../../routes/mypage/+page.svelte';

	const mockRecentMatches = [
		{ id: '1', name: 'Wild West Duel', result: 'win' as const, score: '3:1', date: 'Today' },
		{ id: '2', name: 'Gold Rush Heist', result: 'win' as const, score: '2:1', date: 'Today' },
		{ id: '3', name: 'Saloon Brawl', result: 'loss' as const, score: '1:3', date: 'Yesterday' },
		{ id: '4', name: 'Train Robbery', result: 'win' as const, score: '3:0', date: 'Yesterday' },
		{ id: '5', name: 'Desert Showdown', result: 'loss' as const, score: '0:3', date: '2 days ago' }
	];

	const { Story } = defineMeta({
		title: 'Pages/Mypage',
		component: MypagePage,
		parameters: {
			layout: 'fullscreen'
		}
	});
</script>

<Story name="With Match History" asChild>
	<MypagePage
		data={{
			username: 'Sheriff_Buck',
			avatarSrc: '',
			recentMatches: mockRecentMatches,
			stats: { games: 128, wins: 87, streak: 9 }
		}}
	/>
</Story>

<Story name="Empty State" asChild>
	<MypagePage
		data={{
			username: 'NewPlayer',
			avatarSrc: '',
			recentMatches: [],
			stats: { games: 0, wins: 0, streak: 0 }
		}}
	/>
</Story>
