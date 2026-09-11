import { get, put } from './client.js';

/** body: {items:[{date, timeType:'OPEN'|'CLOSE'|'NORMAL'}, ...]} — 같은 날짜에 여러 timeType이
 * 가능하면 그 날짜로 항목을 여러 개 넣는다(하나의 item이 date+timeType 한 쌍). */
export const submitNextWeek = (storeId, body) => put(`/stores/${storeId}/available-times`, body);
export const getMyNextWeek = (storeId) => get(`/stores/${storeId}/available-times/me`);
export const getOwnerWeeklyAvailability = (storeId) =>
	get(`/stores/${storeId}/owner/available-times/weekly`);
