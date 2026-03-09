<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import MypagePage from '../../../routes/mypage/+page.svelte';

	const { Story } = defineMeta({
		title: 'Pages/Mypage',
		component: MypagePage,
		parameters: {
			layout: 'fullscreen'
		}
	});
</script>

<Story name="Default" />
