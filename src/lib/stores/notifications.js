import { writable, derived, get } from 'svelte/store';
import { getMyAlarms, markAlarmRead, getUnreadAlarmCount, markAllAlarmsRead } from '../api/alarm.js';
import { session } from './session.js';

// 알림은 한 번 보고 치우는 데이터라 안 읽은 것(readCheck=false)만 들고 있는다. 읽음 처리(누르기·스와이프·×)
// 하면 목록에서 바로 뺀다 - 읽은 알림을 다시 불러오는 화면은 없다.
//
// 목록은 커서 페이징(alarmTargetId 내림차순, 10건씩)이다. "더보기"는 지금 들고 있는 가장 오래된(가장 작은)
// alarmTargetId를 cursor로 넘겨 그보다 오래된 안 읽은 알림을 이어 받는다 - 중간에 읽음 처리해서 빠진 게
// 있어도 건너뛰거나 겹치지 않는다.

/** 안 읽은 알림(최신순) */
export const notifications = writable(/** @type {any[]} */ ([]));
/** 아직 안 불러온 안 읽은 알림이 더 있는지 */
export const hasMoreNotifications = writable(false);
/** 서버 기준 안 읽은 알림 개수(GET .../alarms/unread-count) */
const unreadTotal = writable(0);
/** 배지 표시값(없으면 0) */
export const unreadCount = derived(unreadTotal, ($n) => $n);

let poller;
let loadingMore = false;
/** 목록을 받은 매장·사람(티켓). 매장 전환이나 테스트 멤버 전환으로 바뀌면 이전 목록을 버린다 */
let ownerKey = '';

const minId = (list) => list.reduce((m, a) => Math.min(m, a.alarmTargetId), Infinity);

/** 첫 페이지를 다시 받아 위쪽을 갱신한다. 더보기로 이미 불러온 아래쪽(첫 페이지보다 오래된 것)은 그대로 둔다. */
export async function refreshNotifications() {
	const s = get(session);
	if (!s.storeId) return;
	const key = `${s.storeId}:${s.ticketId}`;
	if (key !== ownerKey) {
		ownerKey = key;
		notifications.set([]);
		hasMoreNotifications.set(false);
		unreadTotal.set(0);
	}
	try {
		const [page, count] = await Promise.all([getMyAlarms(s.storeId, false), getUnreadAlarmCount(s.storeId)]);
		unreadTotal.set(count.unreadCount);
		const boundary = minId(page.content);
		const tail = page.hasNext ? get(notifications).filter((a) => a.alarmTargetId < boundary) : [];
		notifications.set([...page.content, ...tail]);
		// 아래쪽을 이미 이어 받아 둔 상태면 그 뒤가 더 있는지는 기존 값을 따른다
		if (!tail.length) hasMoreNotifications.set(page.hasNext);
	} catch {
		/* 알림 갱신 실패는 조용히 무시 - 배지가 잠깐 안 맞는 정도라 화면을 막을 정도는 아님 */
	}
}

/** 아직 화면에 없는 안 읽은 알림을 이어 받는다 */
export async function loadMoreNotifications() {
	const s = get(session);
	const list = get(notifications);
	if (!s.storeId || loadingMore || !get(hasMoreNotifications)) return;
	if (!list.length) return refreshNotifications(); // 보이던 걸 다 읽음 처리했으면 처음부터 다시 받는다
	loadingMore = true;
	try {
		const page = await getMyAlarms(s.storeId, false, minId(list));
		notifications.update((cur) => {
			const have = new Set(cur.map((a) => a.alarmTargetId));
			return [...cur, ...page.content.filter((a) => !have.has(a.alarmTargetId))];
		});
		hasMoreNotifications.set(page.hasNext);
	} finally {
		loadingMore = false;
	}
}

/** 읽음 처리된 알림을 목록에서 빼고 배지를 줄인다 */
export function removeLocal(alarmTargetId) {
	let removed = false;
	notifications.update((list) => {
		const next = list.filter((a) => a.alarmTargetId !== alarmTargetId);
		removed = next.length !== list.length;
		return next;
	});
	if (removed) unreadTotal.update((n) => Math.max(0, n - 1));
}

/** 안 읽은 알림을 모두 읽음 처리한다 */
export async function readAllNotifications() {
	const s = get(session);
	if (!s.storeId) return;
	await markAllAlarmsRead(s.storeId);
	notifications.set([]);
	hasMoreNotifications.set(false);
	unreadTotal.set(0);
}

/** 알림 하나를 읽음 처리하고 목록에서 뺀다(누르기·스와이프·× 공통). 먼저 빼서 바로 사라지게 하고,
 * 실패하면 다시 불러와 되돌린다. */
export async function readNotification(storeId, alarmTargetId) {
	removeLocal(alarmTargetId);
	try {
		await markAlarmRead(storeId, alarmTargetId);
	} catch {
		refreshNotifications();
	}
}

/** 이동 없이 읽음 처리만 한다(스와이프/× 버튼) */
export function dismissNotification(alarmTargetId) {
	const s = get(session);
	if (s.storeId) readNotification(s.storeId, alarmTargetId);
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
