import { goto } from '$app/navigation';
import { getAlarmDetail } from '../api/alarm.js';

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

/** 알람 하나를 읽음 처리하고 그 대상 화면으로 이동한다 — 벨 드롭다운/알림 목록/포그라운드
 * 토스트 클릭이 전부 이 함수 하나로 모인다. 읽음 처리가 실패해도(이미 지난 알람 등) 이동은
 * 계속 진행한다. */
export async function openAlarm(alarm, storeId, isOwner) {
	try {
		await getAlarmDetail(storeId, alarm.alarmTargetId);
	} catch {
		/* 읽음 처리 실패는 무시 - 이동 자체는 계속 진행 */
	}
	await goto(alarmTargetPath(alarm, isOwner));
}
