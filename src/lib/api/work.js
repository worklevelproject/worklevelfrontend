import { get, post, patch, del } from './client.js';

// ── 접근 허용(전직원) ──────────────────────────────────────────
// 목록 조회는 전부 PageResponse<T,S> 봉투({content, search, offset, limit, totalCount, hasNext})로
// 온다 - lib/utils/pagedList.svelte.js의 createPagedList로 offset을 이어가며 소비한다.
export const getWorks = (storeId, { timeType, year, month, offset = 0 } = {}) =>
	get(`/stores/${storeId}/works`, { timeType, year, month, offset });
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
/** requests: CreateWorkRequest[] (배열로 한 번에 여러 건) - 각 항목 {timeType?, startTime, endTime, participantTicketIds} */
export const createWorks = (storeId, requests) => post(`/stores/${storeId}/owner/works`, requests);
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
