import { get, post, patch } from './client.js';

// ── 점주 전용 ────────────────────────────────────────────────
export const startOrResumeResignation = (storeId, ticketId) =>
	post(`/stores/${storeId}/owner/employees/${ticketId}/resignation`);
export const getResignationForOwner = (storeId, ticketId) =>
	get(`/stores/${storeId}/owner/employees/${ticketId}/resignation`);
export const confirmResignationType = (storeId, ticketId, resignationType) =>
	patch(`/stores/${storeId}/owner/employees/${ticketId}/resignation/type`, { resignationType });
/** body: 6개 리커트 점수(0~10, 보낸 필드만 반영)?, rehireIntent?, ownerComment?(최대 500자) — 중간 저장용 */
export const saveResignationEvaluation = (storeId, ticketId, body) =>
	patch(`/stores/${storeId}/owner/employees/${ticketId}/resignation/evaluation`, body);
export const sendResignationToEmployee = (storeId, ticketId) =>
	post(`/stores/${storeId}/owner/employees/${ticketId}/resignation/evaluation/send`);

// ── 직원 본인 ───────────────────────────────────────────────
export const getResignationForEmployee = (storeId) => get(`/stores/${storeId}/resignation`);
export const confirmResignationByEmployee = (storeId) => post(`/stores/${storeId}/resignation/confirm`);
export const requestResignationFix = (storeId, reason) =>
	post(`/stores/${storeId}/resignation/fix-request`, { reason });
