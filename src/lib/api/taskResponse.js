import { post, patch } from './client.js';

/** 점주가 task를 특정 직원(ticket)에게 맡긴다(재배정 가능). body: {ticketId} */
export const createTaskResponse = (storeId, taskId, ticketId) =>
	post(`/stores/${storeId}/owner/tasks/${taskId}/responses`, { ticketId });

/** 담당 직원 본인이 완료 처리. body: {response} (contentType에 맞는 jsonb) */
export const completeTaskResponse = (storeId, taskId, taskResponseId, response) =>
	patch(`/stores/${storeId}/tasks/${taskId}/responses/${taskResponseId}/complete`, { response });
