<script>
	import { toast } from '../stores/toast.js';
</script>

<div class="toast" class:show={$toast}>
	{#if $toast}
		{$toast.message}
		{#if $toast.undo}
			<button
				onclick={() => {
					$toast?.undo?.();
					toast.set(null);
				}}
			>
				되돌리기
			</button>
		{/if}
	{/if}
</div>
