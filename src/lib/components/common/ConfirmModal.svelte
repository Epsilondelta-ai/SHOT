<script lang="ts">
	let {
		isOpen = false,
		message = '삭제 하시겠습니까?',
		onconfirm,
		oncancel
	}: {
		isOpen?: boolean;
		message?: string;
		onconfirm?: () => void;
		oncancel?: () => void;
	} = $props();
</script>

{#if isOpen}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
		<div class="comic-border w-full max-w-xs rounded-2xl bg-white p-6">
			<p class="mb-6 text-center text-sm font-black text-slate-800">{message}</p>
			<div class="flex gap-3">
				<button
					class="comic-button flex-1 rounded-lg border-2 border-red-500 bg-red-500 py-2 text-xs font-black text-white"
					onclick={onconfirm}
				>
					삭제
				</button>
				<button
					class="comic-button flex-1 rounded-lg border-2 border-slate-300 bg-white py-2 text-xs font-black text-slate-600"
					onclick={oncancel}
				>
					취소
				</button>
			</div>
		</div>
	</div>
{/if}
