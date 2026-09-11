<script>
	import { onMount } from 'svelte';
	import { session } from '$lib/stores/session.js';
	import { getAlarmDetail } from '$lib/api/alarm.js';
	import { notifications, refreshNotifications } from '$lib/stores/notifications.js';
	import { showToast } from '$lib/stores/toast.js';

	let opened = $state(/** @type {any} */ (null));

	onMount(refreshNotifications);

	async function open(a) {
		opened = await getAlarmDetail($session.storeId, a.alarmTargetId);
		refreshNotifications();
	}
</script>

<svelte:head><title>알림 · WORKLEVEL</title></svelte:head>

<div class="hdr">
	<div>
		<div class="eyebrow">알림을 누르면 읽음으로 바뀌어요</div>
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
	{#if opened}
		<div class="card w">
			<h3 style="margin-bottom:8px">{opened.title}</h3>
			<p style="color:var(--graphite);white-space:pre-line">{opened.content}</p>
			<p class="tiny muted" style="margin-top:12px">{opened.refType} #{opened.refId}</p>
		</div>
	{/if}
</div>
