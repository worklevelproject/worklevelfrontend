import { get, put } from './client.js';

// 점주 전용. 매장당 오픈/마감/보통 최대 3건 고정.
export const upsertTemplates = (storeId, slots) => put(`/stores/${storeId}/owner/time-templates`, { slots });
export const getTemplates = (storeId) => get(`/stores/${storeId}/owner/time-templates`);
