import { get, post, patch, del } from './client.js';

// category: 'NOTICE' | 'EDUCATION' | 'RECIPE'
export const getManualItems = (storeId, category) =>
	get(`/stores/${storeId}/manual-items`, { category });
export const getManualItem = (storeId, manualItemId) =>
	get(`/stores/${storeId}/manual-items/${manualItemId}`);

// ── 점주 전용 ────────────────────────────────────────────────
export const createManualItem = (storeId, body) => post(`/stores/${storeId}/owner/manual-items`, body);
export const updateManualItem = (storeId, manualItemId, body) =>
	patch(`/stores/${storeId}/owner/manual-items/${manualItemId}`, body);
export const deleteManualItem = (storeId, manualItemId) =>
	del(`/stores/${storeId}/owner/manual-items/${manualItemId}`);
