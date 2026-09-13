import { get } from './client.js';

/**
 * 직원 본인의 출퇴근 이력(오늘 상태 확인용으로도 씀 - fromDate=toDate=오늘로 호출).
 * PageResponse<AttendanceItemResponse, {fromDate,toDate}> 봉투 - createPagedList로 소비한다.
 * AttendanceItemResponse: {workRequestId, ticketId, alias, workDate, workStartTime, workEndTime,
 *   checkInTime, checkIn, checkOutTime, checkOut, workMinutes, status}
 */
export const getMyAttendanceHistory = (storeId, { fromDate, toDate, offset = 0 } = {}) =>
	get(`/stores/${storeId}/attendances/mine`, { fromDate, toDate, offset });
