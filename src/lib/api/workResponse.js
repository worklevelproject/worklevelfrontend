import { get, post, patch } from './client.js';

export const createResponse = (storeId, workId, body) =>
	post(`/stores/${storeId}/works/${workId}/response`, body);
export const updateResponse = (storeId, workId, body) =>
	patch(`/stores/${storeId}/works/${workId}/response`, body);
export const getResponse = (storeId, workId) => get(`/stores/${storeId}/works/${workId}/response`);
export const getResponses = (storeId, status) => get(`/stores/${storeId}/work-responses`, { status });
/** 점주가 승인/반려 + 비고 수정. body: {status:'SUCCESS'|'REJECT', note?} */
export const updateStatus = (storeId, workId, body) =>
	patch(`/stores/${storeId}/owner/works/${workId}/response`, body);
