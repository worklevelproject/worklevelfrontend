<script>
	import { confirmState, closeConfirm } from '../stores/confirm.js';
</script>

<div class="modal" class:show={$confirmState}>
	<div class="box">
		{#if $confirmState}
			<h3>{$confirmState.title}</h3>
			<p>{$confirmState.message}</p>
			<div class="acts">
				<button class="btn s" onclick={closeConfirm}>취소</button>
				<button
					class="btn {$confirmState.danger ? 'd' : 'p'}"
					onclick={() => {
						const fn = $confirmState?.onConfirm;
						closeConfirm();
						fn?.();
					}}
				>
					{$confirmState.okLabel}
				</button>
			</div>
		{/if}
	</div>
</div>
