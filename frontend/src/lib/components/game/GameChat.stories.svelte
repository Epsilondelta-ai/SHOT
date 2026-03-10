<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { fn } from 'storybook/test';
	import GameChat from './GameChat.svelte';

	const { Story } = defineMeta({
		title: 'Game/GameChat',
		component: GameChat,
		tags: ['autodocs'],
		parameters: {
			layout: 'fullscreen'
		},
		args: {
			ontoggle: fn(),
			onsend: fn()
		}
	});
</script>

<Story
	name="Closed"
	args={{
		myId: 'player-1',
		isOpen: false,
		messages: []
	}}
/>

<Story
	name="Open Empty"
	args={{
		myId: 'player-1',
		isOpen: true,
		messages: []
	}}
/>

<Story
	name="Open With Messages"
	args={{
		myId: 'player-1',
		isOpen: true,
		messages: [
			{ id: '1', playerId: 'player-2', playerName: 'Alice', text: '안녕하세요!' },
			{ id: '2', playerId: 'player-1', playerName: 'Me', text: '반갑습니다~' },
			{ id: '3', playerId: 'player-2', playerName: 'Alice', text: '게임 잘 부탁드려요' },
			{ id: '4', playerId: 'player-3', playerName: 'Bob', text: '저도요!' }
		]
	}}
/>

<Story
	name="My Messages Only"
	args={{
		myId: 'player-1',
		isOpen: true,
		messages: [
			{ id: '1', playerId: 'player-1', playerName: 'Me', text: '혼자 얘기하는 중...' },
			{ id: '2', playerId: 'player-1', playerName: 'Me', text: '아무도 없나요?' }
		]
	}}
/>

<Story
	name="Long Conversation"
	args={{
		myId: 'player-1',
		isOpen: true,
		messages: [
			{ id: '1', playerId: 'player-2', playerName: 'Alice', text: '게임 시작!' },
			{ id: '2', playerId: 'player-1', playerName: 'Me', text: '준비 완료' },
			{ id: '3', playerId: 'player-3', playerName: 'Bob', text: '저도요' },
			{ id: '4', playerId: 'player-2', playerName: 'Alice', text: '이번 라운드 어렵네요' },
			{ id: '5', playerId: 'player-1', playerName: 'Me', text: '맞아요, 단어가 너무 어려워요' },
			{ id: '6', playerId: 'player-3', playerName: 'Bob', text: '힌트 좀요 ㅋㅋ' },
			{ id: '7', playerId: 'player-2', playerName: 'Alice', text: '힌트 없어요~' },
			{ id: '8', playerId: 'player-1', playerName: 'Me', text: '아 맞다!' }
		]
	}}
/>
