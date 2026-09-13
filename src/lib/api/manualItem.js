import { get, post, patch, del } from './client.js';

// category: 'NOTICE' | 'EDUCATION' | 'RECIPE'
// PageResponse<ManualItemResponse, {category}> 봉투 - createPagedList로 소비한다.
export const getManualItems = (storeId, category, offset = 0) =>
	get(`/stores/${storeId}/manual-items`, { category, offset });
export const getManualItem = (storeId, manualItemId) =>
	get(`/stores/${storeId}/manual-items/${manualItemId}`);

// ── 점주 전용 ────────────────────────────────────────────────
export const createManualItem = (storeId, body) => post(`/stores/${storeId}/owner/manual-items`, body);
export const updateManualItem = (storeId, manualItemId, body) =>
	patch(`/stores/${storeId}/owner/manual-items/${manualItemId}`, body);
export const deleteManualItem = (storeId, manualItemId) =>
	del(`/stores/${storeId}/owner/manual-items/${manualItemId}`);
