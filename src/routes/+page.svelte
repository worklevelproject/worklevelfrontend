<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { authReady } from '$lib/stores/authReady.js';
	import { resolveEntryPath } from '$lib/stores/session.js';
	import { getAccessToken } from '$lib/api/token.js';
	import { goToPushAlarm } from '$lib/utils/alarmNav.js';

	$effect(() => {
		if (!$authReady) return;
		route();
	});

	async function route() {
		if (!getAccessToken()) {
			await goto('/login');
			return;
		}
		if (await openPendingAlarm()) return;
		await goto(await resolveEntryPath());
	}

	/** 백그라운드 푸시(OS 알림)를 클릭해서 들어온 경우 서비스워커가 `?openAlarmId=&refType=
	 * &refId=&storeId=`를 붙여준다(static/firebase-messaging-sw.js 참고) - goToPushAlarm이
	 * 알람이 속한 매장으로 전환(현재 세션과 다르면)하고 대상 화면으로 이동까지 처리한다.
	 * @returns {Promise<boolean>} openAlarmId가 있어 처리를 위임했으면 true
	 */
	async function openPendingAlarm() {
		const params = page.url.searchParams;
		const alarmId = params.get('openAlarmId');
		if (!alarmId) return false;
		await goToPushAlarm({
			alarmId,
			refType: params.get('refType'),
			refId: params.get('refId'),
			storeId: params.get('storeId')
		});
		return true;
	}
</script>

<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;color:var(--pewter)">
	불러오는 중…
</div>
