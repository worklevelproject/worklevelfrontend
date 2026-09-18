<script>
	import { toast } from '../stores/toast.js';

	function handleClick() {
		if (!$toast?.onClick) return;
		$toast.onClick();
		toast.set(null);
	}
</script>

{#snippet body()}
	{#if $toast}
		{$toast.message}
		{#if $toast.undo}
			<button
				onclick={(e) => {
					e.stopPropagation();
					$toast?.undo?.();
					toast.set(null);
				}}
			>
				되돌리기
			</button>
		{/if}
	{/if}
{/snippet}

{#if $toast?.onClick}
	<div class="toast click" class:show={$toast} role="button" tabindex="0" onclick={handleClick} onkeydown={(e) => e.key === 'Enter' && handleClick()}>
		{@render body()}
	</div>
{:else}
	<div class="toast" class:show={$toast}>
		{@render body()}
	</div>
{/if}
