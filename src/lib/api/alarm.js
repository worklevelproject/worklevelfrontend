import { get, apiFetch } from './client.js';

// CursorResponse<AlarmSummaryResponse, {readCheck}> 봉투 {content, search, nextCursor, hasNext, limit} - 최신순(alarmTargetId
// 내림차순) 10건씩. 다음 페이지는 직전 응답의 nextCursor를 cursor로 넘기고, 같은 readCheck를 함께 보낸다.
// 총개수(totalCount)는 내려오지 않는다.
export const getMyAlarms = (storeId, readCheck, cursor) =>
	get(`/stores/${storeId}/alarms`, { readCheck, cursor });
/** 상세 조회만으로는 읽음 처리되지 않는다 - markAlarmRead를 따로 부른다 */
export const getAlarmDetail = (storeId, alarmTargetId) =>
	get(`/stores/${storeId}/alarms/${alarmTargetId}`);
/** 알림 하나를 읽음 처리(204). 이미 읽은 알림이어도 성공한다. 스와이프처럼 가벼운 요청이라 전역 로딩
 * 오버레이(client.js의 patch)를 거치지 않고 apiFetch로 바로 보낸다. */
export const markAlarmRead = (storeId, alarmTargetId) =>
	apiFetch(`/stores/${storeId}/alarms/${alarmTargetId}/read`, { method: 'PATCH' });
