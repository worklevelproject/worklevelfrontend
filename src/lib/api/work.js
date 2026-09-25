import { get, post, patch, del } from './client.js';

// ── 접근 허용(전직원) ──────────────────────────────────────────
// 목록 조회는 전부 PageResponse<T,S> 봉투({content, search, offset, limit, totalCount, hasNext})로
// 온다 - lib/utils/pagedList.svelte.js의 createPagedList로 offset을 이어가며 소비한다.
/** 근무 목록 항목: {id, seriesId(반복 근무면), startTime, endTime, closing(마감 근무), assigned(본인 배정 여부), workers:[{ticketId, alias}]} */
export const getWorks = (storeId, { closing, year, month, offset = 0 } = {}) =>
	get(`/stores/${storeId}/works`, { closing, year, month, offset });
export const getWork = (storeId, workId) => get(`/stores/${storeId}/works/${workId}`);
/** 내 근무 배정 목록. 근무는 생성 즉시 확정이라 수락/거절 단계 없이 status 필터도 없다.
 * PageResponse<WorkAssignmentResponse, Void> - {workAssignmentId, ticketId, alias, workId, workStartTime, workEndTime} */
export const getMyWorkAssignments = (storeId, offset = 0) =>
	get(`/stores/${storeId}/work-assignments/mine`, { offset });
export const checkIn = (storeId, workId) => post(`/stores/${storeId}/works/${workId}/check-in`);
export const checkOut = (storeId, workId) => post(`/stores/${storeId}/works/${workId}/check-out`);
/** 직원 본인이 출퇴근 정정을 제안 (checkInTime/checkOutTime 중 보낸 것만 반영, ISO datetime 문자열) */
export const proposeAttendanceCorrection = (storeId, workAssignmentId, body) =>
	patch(`/stores/${storeId}/work-assignments/${workAssignmentId}/attendance`, body);

// ── 점주 전용 ────────────────────────────────────────────────
/** requests: CreateWorkRequest[] (배열로 한 번에 여러 건) - 각 항목 {timeType(필수, 서버는 CLOSE인지만 봐서 closing으로 저장), startTime, endTime, participantTicketIds} */
export const createWorks = (storeId, requests) => post(`/stores/${storeId}/owner/works`, requests);
/** body: {timeType?, startTime?, endTime?, participantTicketIds?} - 보낸 필드만 바뀐다(시작 전 근무만). 시각을 바꾸면 기존 참여자에게 시간 변경 알림 */
export const updateWork = (storeId, workId, body) =>
	patch(`/stores/${storeId}/owner/works/${workId}`, body);
export const deleteWork = (storeId, workId) => del(`/stores/${storeId}/owner/works/${workId}`);
export const getWorkQrCode = (storeId, workId) =>
	get(`/stores/${storeId}/owner/works/${workId}/qr-code`);
export const getStoreWorkAssignments = (storeId, offset = 0) =>
	get(`/stores/${storeId}/owner/work-assignments`, { offset });
export const deleteWorkAssignment = (storeId, workAssignmentId) =>
	del(`/stores/${storeId}/owner/work-assignments/${workAssignmentId}`);
export const confirmAttendanceCorrection = (storeId, workAssignmentId) =>
	post(`/stores/${storeId}/owner/work-assignments/${workAssignmentId}/attendance-correction/confirm`);
export const rejectAttendanceCorrection = (storeId, workAssignmentId) =>
	post(`/stores/${storeId}/owner/work-assignments/${workAssignmentId}/attendance-correction/reject`);
export const getAttendanceCorrections = (storeId, offset = 0) =>
	get(`/stores/${storeId}/owner/work-assignments/attendance-corrections`, { offset });
/** 결근(NO_SHOW) 확정 건을 점주가 실제 출퇴근 시각을 확정해 지각/정상 출근으로 되돌림 (checkInTime/checkOutTime 둘 다 필수, ISO datetime) */
export const reviveNoShow = (storeId, workAssignmentId, body) =>
	post(`/stores/${storeId}/owner/work-assignments/${workAssignmentId}/no-show/revive`, body);
export const getOwnerWeeklySchedule = (storeId, date) =>
	get(`/stores/${storeId}/owner/works/weekly`, { date });
export const getOwnerMonthlySchedule = (storeId, year, month) =>
	get(`/stores/${storeId}/owner/works/monthly`, { year, month });

// ── 반복 근무 규칙(점주 전용) ─────────────────────────────────────
// 등록하면 오늘부터 4주 뒤까지 근무를 만들고, 서버 스케줄러가 계속 이어 채운다. 생성된 근무에는 seriesId가 붙는다.
/** body: {daysOfWeek:['MONDAY',...], startTime:'HH:mm', endTime:'HH:mm', timeType, startDate:'YYYY-MM-DD', endDate?, participantTicketIds} */
export const createWorkSeries = (storeId, body) => post(`/stores/${storeId}/owner/work-series`, body);
export const getWorkSeriesList = (storeId) => get(`/stores/${storeId}/owner/work-series`);
/** body: {startTime?, endTime?, timeType?, participantTicketIds?} - 그 규칙의 시작 전 근무 전부에 반영 */
export const updateWorkSeries = (storeId, seriesId, body) => patch(`/stores/${storeId}/owner/work-series/${seriesId}`, body);
/** from(YYYY-MM-DD, 생략 시 오늘)부터 시작 전 근무를 지우고 규칙은 그 전날까지로 끝낸다 */
export const deleteWorkSeries = (storeId, seriesId, from) =>
	del(`/stores/${storeId}/owner/work-series/${seriesId}${from ? `?from=${from}` : ''}`);
