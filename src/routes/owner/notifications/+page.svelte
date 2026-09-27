<script>
	import { onMount } from 'svelte';
	import { refreshNotifications } from '$lib/stores/notifications.js';
	import NotificationList from '$lib/components/NotificationList.svelte';

	onMount(refreshNotifications);
</script>

<svelte:head><title>알림 · WORKLEVEL</title></svelte:head>

<div class="hdr">
	<div>
		<div class="eyebrow">안 읽은 알림만 보여요 · 누르면 해당 화면으로 가고, 오른쪽으로 밀거나 ×를 누르면 읽음 처리돼요</div>
		<h1>알림</h1>
	</div>
</div>

<NotificationList owner />
