import { get } from './client.js';

export const getMyAlarms = (storeId, readCheck) => get(`/stores/${storeId}/alarms`, { readCheck });
export const getAlarmDetail = (storeId, alarmTargetId) =>
	get(`/stores/${storeId}/alarms/${alarmTargetId}`);
