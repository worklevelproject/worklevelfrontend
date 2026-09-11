import { get, put } from './client.js';

// 점주 전용. body: {minStaff, responseDeadlineMinutes, submitDeadlineDayOfWeek}
export const upsert = (storeId, body) => put(`/stores/${storeId}/owner/time-config`, body);
export const getConfig = (storeId) => get(`/stores/${storeId}/owner/time-config`);
