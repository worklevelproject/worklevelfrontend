import { get, post } from './client.js';

// storeId가 아니라 ticketId로 스코프된다(백엔드 매핑이 /tickets/{ticketId}/contract-documents).
export const register = (ticketId, body) => post(`/tickets/${ticketId}/contract-documents`, body);
export const getList = (ticketId) => get(`/tickets/${ticketId}/contract-documents`);
export const getDetail = (ticketId, contractDocumentId) =>
	get(`/tickets/${ticketId}/contract-documents/${contractDocumentId}`);
