import { get } from './client.js';

/** date(YYYY-MM-DD)가 속한 주(월~일)의 출퇴근 항목 원본 목록. 오늘 현황/주간 통계는 프론트에서 계산. */
export const getAttendance = (storeId, date) => get(`/stores/${storeId}/owner/dashboard/attendance`, { date });
