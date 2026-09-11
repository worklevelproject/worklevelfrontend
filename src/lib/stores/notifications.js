import { writable, derived, get } from 'svelte/store';
import { getMyAlarms } from '../api/alarm.js';
import { session } from './session.js';

export const notifications = writable(/** @type {any[]} */ ([]));
export const unreadCount = derived(notifications, ($n) => $n.filter((a) => !a.readCheck).length);

let poller;

export async function refreshNotifications() {
	const s = get(session);
	if (!s.storeId) return;
	try {
		notifications.set(await getMyAlarms(s.storeId));
	} catch {
		/* 알림 갱신 실패는 조용히 무시 - 배지가 잠깐 안 맞는 정도라 화면을 막을 정도는 아님 */
	}
}

/** 60초 간격 폴링 시작. layout onMount에서 호출, onDestroy에서 stopPolling(). */
export function startPolling() {
	refreshNotifications();
	stopPolling();
	poller = setInterval(refreshNotifications, 60000);
}

export function stopPolling() {
	if (poller) clearInterval(poller);
}
