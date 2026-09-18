<script>
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { authReady } from '$lib/stores/authReady.js';
	import { session, isOwner } from '$lib/stores/session.js';
	import { getAccessToken } from '$lib/api/token.js';
	import { startPolling, stopPolling } from '$lib/stores/notifications.js';
	import { setupPushNotifications, onForegroundAlarmPush } from '$lib/firebase/messaging.js';
	import { goToPushAlarm } from '$lib/utils/alarmNav.js';
	import { showToast } from '$lib/stores/toast.js';
	import { titleFor } from '$lib/utils/titles.js';
	import Shell from './Shell.svelte';

	/** @type {{owner: boolean, children?: import('svelte').Snippet}} */
	let { owner, children } = $props();

	let checked = $state(false);

	$effect(() => {
		if (!$authReady) return;
		guard();
	});

	async function guard() {
		if (!getAccessToken()) {
			await goto('/login');
			return;
		}
		if (!$session.ready) {
			try {
				await session.loadFromStorage();
			} catch {
				/* selectStore가 실패로 이미 세션을 비웠음 */
			}
		}
		if (!$session.storeId) {
			await goto('/onboarding');
			return;
		}
		const actuallyOwner = get_isOwner();
		if (owner !== actuallyOwner) {
			await goto(actuallyOwner ? '/owner/today' : '/staff/today');
			return;
		}
		checked = true;
		startPolling();
		setupPushNotifications();
	}

	function get_isOwner() {
		let v = false;
		const unsub = isOwner.subscribe((x) => (v = x));
		unsub();
		return v;
	}

	/** 탭이 열려 있는 동안(포그라운드) 도착한 푸시는 서비스워커가 아니라 여기서 받는다 —
	 * 클릭 가능한 토스트로 띄우고, 누르면 해당 알람으로 이동한다(다른 매장 것이면 그 매장으로
	 * 전환까지 goToPushAlarm이 처리한다). */
	let stopForegroundListener = () => {};
	onMount(async () => {
		stopForegroundListener = await onForegroundAlarmPush((payload) => {
			const title = payload.notification?.title || '새 알림';
			showToast(title, { onClick: () => goToPushAlarm(payload.data || {}) });
		});
	});

	onDestroy(() => {
		stopPolling();
		stopForegroundListener();
	});

	const title = $derived(titleFor(page.url.pathname));
</script>

{#if checked}
	<Shell {owner} {title}>
		{@render children?.()}
	</Shell>
{/if}
