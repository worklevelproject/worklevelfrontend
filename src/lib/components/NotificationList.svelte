<script>
	import { session } from '$lib/stores/session.js';
	import { notifications, hasMoreNotifications, loadMoreNotifications, dismissNotification } from '$lib/stores/notifications.js';
	import { openAlarm } from '$lib/utils/alarmNav.js';

	/** 안 읽은 알림 목록. 누르면 해당 화면으로 가고, 오른쪽으로 밀거나 ×를 누르면 읽음 처리돼 사라진다.
	 * @type {{owner: boolean}} */
	let { owner } = $props();

	const SWIPE_DONE = 80; // 이만큼(px) 오른쪽으로 밀면 읽음 처리
	/** 지금 밀고 있는 알림과 그 이동 거리 */
	let drag = $state(/** @type {{id: number, x0: number, dx: number} | null} */ (null));
	let loadingMore = $state(false);

	function onDown(e, id) {
		if (e.button !== 0) return;
		drag = { id, x0: e.clientX, dx: 0 };
		e.currentTarget.setPointerCapture(e.pointerId);
	}
	function onMove(e) {
		if (drag) drag.dx = Math.max(0, e.clientX - drag.x0);
	}
	function onUp(n) {
		if (!drag) return;
		const { dx } = drag;
		drag = null;
		if (dx >= SWIPE_DONE) dismissNotification(n.alarmTargetId);
		else if (dx < 6) openAlarm(n, $session.storeId, owner); // 거의 안 밀었으면 클릭으로 본다
	}

	async function more() {
		loadingMore = true;
		try {
			await loadMoreNotifications();
		} finally {
			loadingMore = false;
		}
	}
</script>

<div class="card w" style="max-width:720px;padding:4px 20px">
	{#each $notifications as n (n.alarmTargetId)}
		{@const dx = drag?.id === n.alarmTargetId ? drag.dx : 0}
		<div class="swipe">
			<div class="under" style="opacity:{Math.min(1, dx / SWIPE_DONE)}">읽음</div>
			<div
				class="notif"
				role="button"
				tabindex="0"
				style="transform:translateX({dx}px);{dx ? '' : 'transition:transform var(--t)'}"
				onpointerdown={(e) => onDown(e, n.alarmTargetId)}
				onpointermove={onMove}
				onpointerup={() => onUp(n)}
				onpointercancel={() => (drag = null)}
				onkeydown={(e) => e.key === 'Enter' && openAlarm(n, $session.storeId, owner)}
			>
				<span class="dot"></span>
				<span class="main">
					<div class="t">{n.title}</div>
					<div class="s">{new Date(n.occurredAt).toLocaleString('ko-KR')}</div>
				</span>
				<button
					class="x"
					aria-label="읽음 처리"
					title="읽음 처리"
					onpointerdown={(e) => e.stopPropagation()}
					onclick={(e) => {
						e.stopPropagation();
						dismissNotification(n.alarmTargetId);
					}}>×</button
				>
			</div>
		</div>
	{:else}
		<div class="empty">새 알림이 없어요</div>
	{/each}
	{#if $hasMoreNotifications}
		<button class="btn s" style="margin:10px 0" disabled={loadingMore} onclick={more}>더보기</button>
	{/if}
</div>

<style>
	.swipe {
		position: relative;
		overflow: hidden;
		border-bottom: 1px solid var(--cloud);
	}
	.swipe:last-of-type {
		border: 0;
	}
	.swipe .notif {
		position: relative;
		background: var(--white);
		border: 0;
		touch-action: pan-y;
		user-select: none;
	}
	.under {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		padding-left: 12px;
		font-size: 12px;
		color: var(--blue);
		background: var(--blue-soft);
	}
	.x {
		flex: none;
		width: 28px;
		height: 28px;
		border-radius: 50%;
		color: var(--pewter);
		font-size: 16px;
		line-height: 1;
	}
	.x:hover {
		background: var(--ash);
		color: var(--carbon);
	}
</style>
