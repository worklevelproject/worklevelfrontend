// 백엔드 enum(도메인 entity) 값을 화면 한글 표기로 옮기는 매핑들.
export const WORK_TYPE = { MONTHLY: '매월', DAILY: '매일', WEEKLY: '매주', NORMAL: '이번만' };
export const TIME_TYPE = { OPEN: '오픈', CLOSE: '마감', NORMAL: '보통' };
export const CONTENT_TYPE = { CHECK: '했어요 버튼', MEMO: '글로 답하기', PHOTO: '사진으로 답하기' };
export const WORK_REQUEST_STATUS = { PENDING: '답 기다리는 중', ACCEPT: '확정', REJECT: '못 나옴' };
export const WORK_RESPONSE_STATUS = { PENDING: '검토 중', SUCCESS: '승인', REJECT: '반려' };
export const ATTENDANCE_STATUS = {
	SCHEDULED: '출근 전',
	LATE: '지각',
	NO_SHOW: '안 옴',
	WORKING: '근무 중',
	LEFT: '퇴근'
};
export const DOC_EXPIRY_STATUS = { VALID: '있음', EXPIRING_SOON: '곧 만료', EXPIRED: '만료됨', NONE: '없음' };
export const DOCUMENT_TYPE = { CONTRACT: '근로계약서', HEALTH_CERTIFICATE: '보건증' };
export const MANUAL_ITEM_CATEGORY = { NOTICE: '공지', EDUCATION: '교육자료', RECIPE: '레시피' };

/** WorkRequestStatus -> pill 클래스(ok/wait/bad) */
export function statusPillClass(status) {
	return status === 'ACCEPT' ? 'ok' : status === 'PENDING' ? 'wait' : 'bad';
}
export function attendancePillClass(status) {
	if (status === 'WORKING') return 'ok';
	if (status === 'LATE' || status === 'NO_SHOW') return 'bad';
	if (status === 'LEFT') return 'off';
	return 'off';
}
export function docPillClass(status) {
	if (status === 'VALID') return 'ok';
	if (status === 'EXPIRING_SOON') return 'wait';
	if (status === 'EXPIRED') return 'bad';
	return 'off';
}
