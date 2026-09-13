import { get } from './client.js';

// PageResponse<AlarmSummaryResponse, {readCheck}> 봉투 - createPagedList로 소비한다.
export const getMyAlarms = (storeId, readCheck, offset = 0) =>
	get(`/stores/${storeId}/alarms`, { readCheck, offset });
export const getAlarmDetail = (storeId, alarmTargetId) =>
	get(`/stores/${storeId}/alarms/${alarmTargetId}`);
