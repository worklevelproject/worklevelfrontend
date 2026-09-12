import { get, post, patch, del } from './client.js';

// ── 접근 허용(전직원) ──────────────────────────────────────────
export const getNotices = (storeId) => get(`/stores/${storeId}/notices`);
export const getNotice = (storeId, noticeId) => get(`/stores/${storeId}/notices/${noticeId}`);

// ── 점주 전용 ────────────────────────────────────────────────
export const createNotice = (storeId, body) => post(`/stores/${storeId}/owner/notices`, body);
export const updateNotice = (storeId, noticeId, body) =>
	patch(`/stores/${storeId}/owner/notices/${noticeId}`, body);
export const deleteNotice = (storeId, noticeId) => del(`/stores/${storeId}/owner/notices/${noticeId}`);
