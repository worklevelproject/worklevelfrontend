<script>
	import { pending } from '../stores/loading.js';

	// 빠르게 끝나는 요청에 오버레이가 번쩍이지 않도록 잠깐 기다렸다가 띄운다.
	const SHOW_DELAY_MS = 250;

	let show = $state(false);

	$effect(() => {
		if ($pending <= 0) {
			show = false;
			return;
		}
		const t = setTimeout(() => (show = true), SHOW_DELAY_MS);
		return () => clearTimeout(t);
	});
</script>

{#if show}
	<div class="loading-overlay" role="status" aria-live="polite" aria-busy="true">
		<div class="loading-box">
			<div class="loading-spin"></div>
			<div class="loading-msg">처리 중이에요…</div>
		</div>
	</div>
{/if}
