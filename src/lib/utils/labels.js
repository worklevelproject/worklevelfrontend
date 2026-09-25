// 백엔드 enum(도메인 entity) 값을 화면 한글 표기로 옮기는 매핑들.
// 직무(백엔드 JobRole). 점주가 직원에게 줄 수 있는 건 EDITABLE_JOB_ROLES뿐이다(OWNER로는 못 바꿈).
export const JOB_ROLE = { OWNER: '점주', MANAGER: '매니저', STAFF: '직원', PART_TIME: '파트타임' };
export const EDITABLE_JOB_ROLES = ['MANAGER', 'STAFF', 'PART_TIME'];
// 기본 근무 요일(백엔드 java.time.DayOfWeek 이름). 월요일부터 순서대로.
export const DAY_KEYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
export const DAY_LABEL = { MONDAY: '월', TUESDAY: '화', WEDNESDAY: '수', THURSDAY: '목', FRIDAY: '금', SATURDAY: '토', SUNDAY: '일' };
/** availableDays(null=미설정, []=가능한 요일 없음) -> "월·수·금" */
export function daysLabel(days) {
	if (days == null) return '미설정';
	if (!days.length) return '없음';
	return DAY_KEYS.filter((k) => days.includes(k)).map((k) => DAY_LABEL[k]).join('·');
}
export const TIME_TYPE = { OPEN: '오픈', AFTERNOON: '오후', CLOSE: '마감', NORMAL: '보통' };
/** 근무에는 시간대가 저장되지 않고 마감 여부(closing)만 있다 - 마감이 아니면 시작 시각으로 오전/오후만 나눠 보여준다 */
export const shiftLabel = (work) => (work?.closing ? '마감' : new Date(work?.startTime).getHours() < 12 ? '오전' : '오후');
export const CONTENT_TYPE = { CHECK: '했어요 버튼', MEMO: '글로 답하기', PHOTO: '사진으로 답하기' };
export const TASK_STATUS = { PENDING: '진행 중', COMPLETE: '완료', FAIL: '기한 넘김' };
export const TASK_RECURRENCE_TYPE = {
	WEEKLY: '매주',
	MONTHLY: '매월',
	DAILY: '매일',
	ONE_TIME: '일시적',
	DEADLINE: '마감',
	OPEN: '상시'
};
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
export const RESIGNATION_TYPE = {
	VOLUNTARY: '자발적 퇴사',
	CONTRACT_EXPIRED: '계약 만료',
	RECOMMENDED: '권고사직',
	DISMISSED: '해고'
};
export const RESIGNATION_STATUS = {
	STAT_CHECK: '지표 확인 중',
	OWNER_EVALUATION: '사장님 평가 중',
	EMPLOYEE_CONFIRM: '직원 확인 대기 중',
	APPROVED: '퇴사 완료'
};
export const REHIRE_INTENT = { YES: '재고용 의향 있음', NO: '재고용 의향 없음', CONDITIONAL: '조건부' };

export function taskStatusPillClass(status) {
	return status === 'COMPLETE' ? 'ok' : status === 'PENDING' ? 'wait' : 'bad';
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
export function resignationPillClass(status) {
	if (status === 'APPROVED') return 'off';
	if (status === 'EMPLOYEE_CONFIRM') return 'wait';
	return 'bad';
}

/** 법정공휴일 이름. 토/일은 백엔드가 이름 없이 '주말'로 내려주므로 공휴일로 세지 않는다(없으면 null) */
export const holidayNameOf = (x) => (x?.isHoliday && x.holidayName && x.holidayName !== '주말' ? x.holidayName : null);

/** 직원별 공제 방식(ticket.deductionType) */
export const DEDUCTION_TYPE = { TAX_3_3: '3.3%', SOCIAL_INSURANCE: '4대보험', NONE: '없음' };
