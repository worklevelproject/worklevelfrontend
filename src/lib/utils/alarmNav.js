import { get } from 'svelte/store';
import { goto } from '$app/navigation';
import { getAlarmDetail, getMyAlarms } from '../api/alarm.js';
import { session, isOwner } from '../stores/session.js';

/**
 * 알람 refType을 실제 이동할 화면 경로로 매핑한다(백엔드 AlarmRefType과 1:1).
 * MANUAL_ITEM만 refId가 그 화면의 id 파라미터와 정확히 일치해서 상세로 바로 이동하고, NOTICE는
 * 목록 화면에 `?open=<id>` 쿼리로 살짝 힌트를 얹는다(그 화면이 마운트 시 읽어서 펼침). 나머지
 * (TASK/WORK/CONTRACT_DOCUMENT/TIME_TEMPLATE/RESIGNATION)는 refId를 특정 항목으로 열어주는
 * 화면 구조가 아직 없어 목록/섹션 화면까지만 이동한다 — 이 타입들은 지금 백엔드가 항상 담당
 * 직원(STAFF) 본인에게만 보내므로 owner 쪽 경로는 대비용 기본값일 뿐 실제로 쓰이진 않는다.
 * @param {{refType: string, refId: number}} alarm
 * @param {boolean} isOwner
 */
export function alarmTargetPath(alarm, isOwner) {
	const { refType, refId } = alarm;
	switch (refType) {
		case 'MANUAL_ITEM':
			return isOwner ? `/owner/recipes/${refId}` : `/staff/recipes/${refId}`;
		case 'NOTICE':
			return (isOwner ? '/owner/notices' : '/staff/notices') + `?open=${refId}`;
		case 'TASK':
			return isOwner ? '/owner/tasks' : '/staff/tasks';
		case 'WORK':
			return isOwner ? '/owner/shifts' : '/staff/schedule';
		case 'CONTRACT_DOCUMENT':
			return isOwner ? '/owner/staff' : '/staff/me';
		case 'TIME_TEMPLATE':
			return isOwner ? '/owner/settings?sec=slots' : '/staff/avail';
		case 'RESIGNATION':
			return isOwner ? '/owner/staff' : '/staff/resignation';
		default:
			return isOwner ? '/owner/notifications' : '/staff/notifications';
	}
}

/** 알람 하나를 읽음 처리하고 그 대상 화면으로 이동한다 — 벨 드롭다운/알림 목록 클릭이 이 함수로
 * 모인다(이미 그 매장 안에서 alarmTargetId를 아는 상태라 읽음 처리를 바로 할 수 있다). 읽음
 * 처리가 실패해도(이미 지난 알람 등) 이동은 계속 진행한다. */
export async function openAlarm(alarm, storeId, isOwnerValue) {
	try {
		await getAlarmDetail(storeId, alarm.alarmTargetId);
	} catch {
		/* 읽음 처리 실패는 무시 - 이동 자체는 계속 진행 */
	}
	await goto(alarmTargetPath(alarm, isOwnerValue));
}

/**
 * FCM 푸시(포그라운드 토스트 클릭, 백그라운드 OS 알림 클릭)에서 쓴다. 백엔드가 이제 push
 * data에 refType/refId/storeId를 함께 실어 보내므로(0c3bf26), 알람 목록을 조회하지 않고도 바로
 * 이동 경로를 알 수 있다 — 그 알람이 지금 활성 매장과 다른 매장 것이면(여러 티켓을 가진 회원)
 * 먼저 그 매장으로 전환한다. alarmTargetId는 여전히 push data에 없어서, 읽음 처리는 알람
 * 목록에서 alarmId로 찾아 최선 노력으로만 시도한다(실패해도 이동엔 영향 없음). refType이 아직
 * 없는 이전 버전 payload가 섞여 들어올 경우에 대비해 그 경우엔 목록 조회 결과로 이동한다.
 * fallbackPath는 아무것도 알아내지 못했을 때(매장 전환 실패, 목록에서 못 찾음 등) 보내는
 * 곳이다 - 기본값 '/'는 루트 페이지의 resolveEntryPath로 다시 정상 진입시킨다.
 * @param {{alarmId?: string|number, refType?: string, refId?: string|number, storeId?: string|number}} data
 * @param {string} [fallbackPath]
 */
export async function goToPushAlarm(data, fallbackPath = '/') {
	const alarmId = data.alarmId ? Number(data.alarmId) : null;
	const refType = data.refType || null;
	const refId = data.refId ? Number(data.refId) : null;
	const pushStoreId = data.storeId ? Number(data.storeId) : null;

	const targetStoreId = pushStoreId ?? get(session).storeId;
	if (!targetStoreId) {
		goto(fallbackPath);
		return;
	}
	if (get(session).storeId !== targetStoreId) {
		try {
			await session.selectStore(targetStoreId);
		} catch {
			goto(fallbackPath); // 이 회원 소유가 아니거나 무효화된 매장
			return;
		}
	}
	const targetOwner = get(isOwner);

	if (refType) {
		goto(alarmTargetPath({ refType, refId }, targetOwner));
	}

	if (!alarmId) {
		if (!refType) goto(fallbackPath);
		return;
	}
	try {
		const { content } = await getMyAlarms(targetStoreId, undefined, 0);
		const match = content.find((a) => a.alarmId === alarmId);
		if (!match) {
			if (!refType) goto(fallbackPath);
			return;
		}
		getAlarmDetail(targetStoreId, match.alarmTargetId).catch(() => {});
		if (!refType) goto(alarmTargetPath(match, targetOwner));
	} catch {
		if (!refType) goto(fallbackPath);
	}
}
