<script>
	import { onMount } from 'svelte';
	import { session } from '$lib/stores/session.js';
	import { notifications, refreshNotifications } from '$lib/stores/notifications.js';
	import { openAlarm } from '$lib/utils/alarmNav.js';

	onMount(refreshNotifications);

	function open(a) {
		openAlarm(a, $session.storeId, true);
	}
</script>

<svelte:head><title>알림 · WORKLEVEL</title></svelte:head>

<div class="hdr">
	<div>
		<div class="eyebrow">알림을 누르면 읽음으로 바뀌고 해당 화면으로 이동해요</div>
		<h1>알림</h1>
	</div>
</div>

<div class="cols">
	<div class="card w" style="max-width:720px;padding:4px 20px">
		{#each $notifications as n (n.alarmTargetId)}
			<button class="notif {n.readCheck ? 'read' : ''}" onclick={() => open(n)}>
				<span class="dot"></span>
				<span class="main">
					<div class="t">{n.title}</div>
					<div class="s">{new Date(n.occurredAt).toLocaleString('ko-KR')}</div>
				</span>
			</button>
		{:else}
			<div class="empty">알림이 없어요</div>
		{/each}
	</div>
</div>
