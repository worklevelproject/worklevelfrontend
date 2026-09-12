import { get, post, patch, del } from './client.js';

/** workId를 주면 그 근무의 인수인계만 조회. 조회는 전직원, 작성/수정/삭제는 그 근무의 accept된 참여자만 */
export const getHandOvers = (storeId, workId) => get(`/stores/${storeId}/hand-overs`, { workId });
export const getHandOver = (storeId, handOverId) => get(`/stores/${storeId}/hand-overs/${handOverId}`);
/** 마감(CLOSE) 근무 1개당 1건만 가능 */
export const createHandOver = (storeId, workId, content) =>
	post(`/stores/${storeId}/hand-overs`, { workId, content });
export const updateHandOver = (storeId, handOverId, content) =>
	patch(`/stores/${storeId}/hand-overs/${handOverId}`, { content });
export const deleteHandOver = (storeId, handOverId) => del(`/stores/${storeId}/hand-overs/${handOverId}`);
