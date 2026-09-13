import { get, post, patch, del } from './client.js';

// ── 접근 허용(전직원) ──────────────────────────────────────────
// 목록 조회는 전부 PageResponse<T,S> 봉투({content, search, offset, limit, totalCount, hasNext})로
// 온다 - lib/utils/pagedList.svelte.js의 createPagedList로 offset을 이어가며 소비한다.
export const getWorks = (storeId, { workType, year, month, offset = 0 } = {}) =>
	get(`/stores/${storeId}/works`, { workType, year, month, offset });
export const getWork = (storeId, workId) => get(`/stores/${storeId}/works/${workId}`);
export const getMyWorkRequests = (storeId, status, offset = 0) =>
	get(`/stores/${storeId}/work-requests/mine`, { status, offset });
export const acceptWorkRequest = (storeId, workRequestId) =>
	post(`/stores/${storeId}/work-requests/${workRequestId}/accept`);
export const rejectWorkRequest = (storeId, workRequestId, reason) =>
	post(`/stores/${storeId}/work-requests/${workRequestId}/reject`, { reason });
export const checkIn = (storeId, workId) => post(`/stores/${storeId}/works/${workId}/check-in`);
export const checkOut = (storeId, workId) => post(`/stores/${storeId}/works/${workId}/check-out`);
/** 직원 본인이 출퇴근 정정을 제안 (checkInTime/checkOutTime 중 보낸 것만 반영, ISO datetime 문자열) */
export const proposeAttendanceCorrection = (storeId, workRequestId, body) =>
	patch(`/stores/${storeId}/work-requests/${workRequestId}/attendance`, body);

// ── 점주 전용 ────────────────────────────────────────────────
/** requests: CreateWorkRequest[] (배열로 한 번에 여러 건) */
export const createWorks = (storeId, requests) => post(`/stores/${storeId}/owner/works`, requests);
export const updateWork = (storeId, workId, body) =>
	patch(`/stores/${storeId}/owner/works/${workId}`, body);
export const deleteWork = (storeId, workId) => del(`/stores/${storeId}/owner/works/${workId}`);
export const getWorkQrCode = (storeId, workId) =>
	get(`/stores/${storeId}/owner/works/${workId}/qr-code`);
export const getStoreWorkRequests = (storeId, status, offset = 0) =>
	get(`/stores/${storeId}/owner/work-requests`, { status, offset });
export const deleteWorkRequest = (storeId, workRequestId) =>
	del(`/stores/${storeId}/owner/work-requests/${workRequestId}`);
export const confirmAttendanceCorrection = (storeId, workRequestId) =>
	post(`/stores/${storeId}/owner/work-requests/${workRequestId}/attendance-correction/confirm`);
export const rejectAttendanceCorrection = (storeId, workRequestId) =>
	post(`/stores/${storeId}/owner/work-requests/${workRequestId}/attendance-correction/reject`);
export const getAttendanceCorrections = (storeId, offset = 0) =>
	get(`/stores/${storeId}/owner/work-requests/attendance-corrections`, { offset });
export const getOwnerWeeklySchedule = (storeId, date) =>
	get(`/stores/${storeId}/owner/works/weekly`, { date });
export const getOwnerMonthlySchedule = (storeId, year, month) =>
	get(`/stores/${storeId}/owner/works/monthly`, { year, month });
