<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import GamePage from '../../../routes/game/[id]/+page.svelte';

	const { Story } = defineMeta({
		title: 'Pages/Game',
		component: GamePage,
		parameters: {
			layout: 'fullscreen'
		}
	});
</script>

<!-- Default: 여러 카드를 보유한 상태 -->
<Story name="Full Hand - With Cards" />

<!-- 카드가 없는 경우 -->
<Story name="Empty Hand - No Cards">
	<svelte:fragment let:args>
		<GamePage {...args} />
	</svelte:fragment>
</Story>

<!-- 게임 종료 상태 -->
<Story name="Game Over">
	<svelte:fragment let:args>
		<GamePage {...args} />
	</svelte:fragment>
</Story>
