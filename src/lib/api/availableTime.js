import { get, put } from './client.js';

/** body: {items:[{date, timeType:'OPEN'|'CLOSE'|'NORMAL'}, ...]} — 같은 날짜에 여러 timeType이
 * 가능하면 그 날짜로 항목을 여러 개 넣는다(하나의 item이 date+timeType 한 쌍). */
export const submitNextWeek = (storeId, body) => put(`/stores/${storeId}/available-times`, body);
export const getMyNextWeek = (storeId) => get(`/stores/${storeId}/available-times/me`);
/** nextWeek=true면 다음주(월~일, 직원들이 이번주에 제출해 둔 값) 범위를 대신 조회한다 */
export const getOwnerWeeklyAvailability = (storeId, nextWeek = false) =>
	get(`/stores/${storeId}/owner/available-times/weekly`, { nextWeek });
