import { get, post, patch, del } from './client.js';

// ── 접근 허용(전직원) ──────────────────────────────────────────
export const getTasks = (storeId) => get(`/stores/${storeId}/tasks`);
export const getTask = (storeId, taskId) => get(`/stores/${storeId}/tasks/${taskId}`);

// ── 점주 전용 ────────────────────────────────────────────────
/** body: {title, contentType:'CHECK'|'MEMO'|'PHOTO', recurrenceType} */
export const createTask = (storeId, body) => post(`/stores/${storeId}/owner/tasks`, body);
export const updateTask = (storeId, taskId, body) =>
	patch(`/stores/${storeId}/owner/tasks/${taskId}`, body);
export const deleteTask = (storeId, taskId) => del(`/stores/${storeId}/owner/tasks/${taskId}`);
