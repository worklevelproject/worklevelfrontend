<script>
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { authReady } from '$lib/stores/authReady.js';
	import { session, isOwner, resolveEntryPath } from '$lib/stores/session.js';
	import { getAccessToken } from '$lib/api/token.js';
	import { getMyAlarms } from '$lib/api/alarm.js';
	import { openAlarm } from '$lib/utils/alarmNav.js';

	$effect(() => {
		if (!$authReady) return;
		route();
	});

	async function route() {
		if (!getAccessToken()) {
			await goto('/login');
			return;
		}
		const entryPath = await resolveEntryPath();
		if (await openPendingAlarm()) return;
		await goto(entryPath);
	}

	/** 백그라운드 푸시 알림(OS 알림)을 클릭해서 들어온 경우 `?openAlarmId=`가 붙어 있다.
	 * 서비스워커는 alarmId만 알고 있어서(refType/refId 없음) 로그인된 여기서 내 알람 목록을
	 * 뒤져 실제 이동 경로를 찾는다 - 최신순 첫 페이지에 없으면(오래돼 밀려났거나, 지금 들어간
	 * 매장이 그 알람이 속한 매장과 다르면) 조용히 포기하고 평소 진입 경로로 보낸다.
	 * @returns {Promise<boolean>} 이동을 처리했으면 true
	 */
	async function openPendingAlarm() {
		const alarmId = Number(page.url.searchParams.get('openAlarmId'));
		const storeId = get(session).storeId;
		if (!alarmId || !storeId) return false;
		try {
			const alarms = await getMyAlarms(storeId, undefined, 0);
			const match = alarms.content.find((a) => a.alarmId === alarmId);
			if (!match) return false;
			await openAlarm(match, storeId, get(isOwner));
			return true;
		} catch {
			return false;
		}
	}
</script>

<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;color:var(--pewter)">
	불러오는 중…
</div>
