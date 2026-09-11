import { get, post, patch, del } from './client.js';

// ── 인증 사용자 공통 ──────────────────────────────────────────
export const createStore = (body) => post('/stores', body); // {name, tel, pos}
export const joinByInviteCode = (inviteCode) => post('/stores/join', { inviteCode });
export const getStore = (storeId) => get(`/stores/${storeId}`);
export const getEmployees = (storeId) => get(`/stores/${storeId}/employees`);
/** 내 ticket 정보(직무/시급/근무시작일 등). jobRole==='OWNER'면 이 매장의 점주. */
export const getMyProfile = (storeId) => get(`/stores/${storeId}/me`);
export const updateMyAlias = (storeId, alias) => patch(`/stores/${storeId}/alias`, { alias });

// ── 점주 전용 ────────────────────────────────────────────────
export const deleteStore = (storeId) => del(`/stores/${storeId}/owner/store`);
export const getEmployeeStats = (storeId, active = true) =>
	get(`/stores/${storeId}/owner/employees/stats`, { active });
export const getEmployeeDetail = (storeId, ticketId) =>
	get(`/stores/${storeId}/owner/employees/${ticketId}`);
export const removeEmployee = (storeId, ticketId) =>
	del(`/stores/${storeId}/owner/employees/${ticketId}`);
export const getInviteCode = (storeId) => get(`/stores/${storeId}/owner/invite-code`);
export const updateEmployeeInfo = (storeId, ticketId, body) =>
	patch(`/stores/${storeId}/owner/employees/${ticketId}`, body);
