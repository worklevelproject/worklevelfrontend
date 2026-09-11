<script>
	import { onMount } from 'svelte';
	import { session } from '$lib/stores/session.js';
	import { getAlarmDetail } from '$lib/api/alarm.js';
	import { notifications, refreshNotifications } from '$lib/stores/notifications.js';

	let opened = $state(/** @type {any} */ (null));
	onMount(refreshNotifications);

	async function open(a) {
		opened = await getAlarmDetail($session.storeId, a.alarmTargetId);
		refreshNotifications();
	}
</script>

<svelte:head><title>알림 · WORKLEVEL</title></svelte:head>

<div class="hdr"><div><h1>알림</h1></div></div>

<div class="cols">
	<div class="card w" style="max-width:720px;padding:4px 20px">
		{#each $notifications as n (n.alarmTargetId)}
			<button class="notif {n.readCheck ? 'read' : ''}" onclick={() => open(n)}>
				<span class="dot"></span>
				<span class="main"><div class="t">{n.title}</div><div class="s">{new Date(n.occurredAt).toLocaleString('ko-KR')}</div></span>
			</button>
		{:else}
			<div class="empty">알림이 없어요</div>
		{/each}
	</div>
	{#if opened}
		<div class="card w"><h3 style="margin-bottom:8px">{opened.title}</h3><p style="white-space:pre-line">{opened.content}</p></div>
	{/if}
</div>
