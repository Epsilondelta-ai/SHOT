<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import RoomPage from '../../../routes/room/[id]/+page.svelte';

	const mockPlayers = [
		{
			id: 'rp1',
			userId: 'p1',
			name: 'Sheriff_Buck',
			avatarSrc: null,
			ready: true,
			type: 'human',
			assistantId: null,
			assistantName: null,
			llmModelId: null,
			modelName: null
		},
		{
			id: 'rp2',
			userId: 'p2',
			name: 'Outlaw_Jane',
			avatarSrc: null,
			ready: false,
			type: 'human',
			assistantId: null,
			assistantName: null,
			llmModelId: null,
			modelName: null
		},
		{
			id: 'rp3',
			userId: 'p3',
			name: 'Doc_Holiday',
			avatarSrc: null,
			ready: true,
			type: 'human',
			assistantId: null,
			assistantName: null,
			llmModelId: null,
			modelName: null
		}
	];

	const mockAssistants = [
		{
			id: 'assistant-1',
			name: '냉철한 전략가',
			prompt: '상황을 냉정하게 분석하고 승률이 높은 선택지를 제안합니다.',
			scope: 'personal'
		}
	];

	const mockModels = [
		{
			id: 'model-1',
			provider: 'openai',
			apiModelName: 'gpt-4.1',
			displayName: 'GPT-4.1'
		}
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
			isAdmin: false,
			username: 'Sheriff_Buck',
			avatarSrc: '',
			roomId: 'room-1',
			roomName: 'Wild West Duel',
			roomCode: 'ABCD',
			maxPlayers: 4,
			myId: 'p1',
			hostId: 'rp1',
			players: mockPlayers,
			chatMessages: mockChatMessages,
			assistants: mockAssistants,
			llmModels: mockModels
		}}
	/>
</Story>

<Story name="As Player" asChild>
	<RoomPage
		data={{
			isAdmin: false,
			username: 'Outlaw_Jane',
			avatarSrc: '',
			roomId: 'room-1',
			roomName: 'Wild West Duel',
			roomCode: 'ABCD',
			maxPlayers: 4,
			myId: 'p2',
			hostId: 'rp1',
			players: mockPlayers,
			chatMessages: mockChatMessages,
			assistants: mockAssistants,
			llmModels: mockModels
		}}
	/>
</Story>

<Story name="All Ready" asChild>
	<RoomPage
		data={{
			isAdmin: false,
			username: 'Sheriff_Buck',
			avatarSrc: '',
			roomId: 'room-2',
			roomName: 'Gold Rush Heist',
			roomCode: 'XY12',
			maxPlayers: 4,
			myId: 'p1',
			hostId: 'rp1',
			players: [
				{
					id: 'rp1',
					userId: 'p1',
					name: 'Sheriff_Buck',
					avatarSrc: null,
					ready: true,
					type: 'human',
					assistantId: null,
					assistantName: null,
					llmModelId: null,
					modelName: null
				},
				{
					id: 'rp2',
					userId: 'p2',
					name: 'Outlaw_Jane',
					avatarSrc: null,
					ready: true,
					type: 'human',
					assistantId: null,
					assistantName: null,
					llmModelId: null,
					modelName: null
				}
			],
			chatMessages: [],
			assistants: mockAssistants,
			llmModels: mockModels
		}}
	/>
</Story>
