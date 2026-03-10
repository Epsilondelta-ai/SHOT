<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import RoomPage from '../../../routes/room/[id]/+page.svelte';

	const mockPlayers = [
		{ id: 'p1', name: 'Sheriff_Buck', ready: true },
		{ id: 'p2', name: 'Outlaw_Jane', ready: false },
		{ id: 'p3', name: 'Doc_Holiday', ready: true }
	];

	const mockChatMessages = [
		{ id: '1', sender: '', text: 'Sheriff_Buck 님이 방을 만들었습니다.', isSystem: true },
		{ id: '2', sender: 'Sheriff_Buck', text: ' 반갑습니다!' },
		{ id: '3', sender: '', text: 'Outlaw_Jane 님이 입장했습니다.', isSystem: true },
		{ id: '4', sender: 'Doc_Holiday', text: ' 준비됐어요!' }
	];

	const { Story } = defineMeta({
		title: 'Pages/Room',
		component: RoomPage,
		parameters: {
			layout: 'fullscreen'
		}
	});
</script>

<Story name="As Host" asChild>
	<RoomPage
		data={{
			roomName: 'Wild West Duel',
			roomCode: 'ABCD',
			maxPlayers: 4,
			myId: 'p1',
			hostId: 'p1',
			players: mockPlayers,
			chatMessages: mockChatMessages
		}}
	/>
</Story>

<Story name="As Player" asChild>
	<RoomPage
		data={{
			roomName: 'Wild West Duel',
			roomCode: 'ABCD',
			maxPlayers: 4,
			myId: 'p2',
			hostId: 'p1',
			players: mockPlayers,
			chatMessages: mockChatMessages
		}}
	/>
</Story>

<Story name="All Ready" asChild>
	<RoomPage
		data={{
			roomName: 'Gold Rush Heist',
			roomCode: 'XY12',
			maxPlayers: 4,
			myId: 'p1',
			hostId: 'p1',
			players: [
				{ id: 'p1', name: 'Sheriff_Buck', ready: true },
				{ id: 'p2', name: 'Outlaw_Jane', ready: true }
			],
			chatMessages: []
		}}
	/>
</Story>
