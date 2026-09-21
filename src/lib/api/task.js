import { get, post, patch, del } from './client.js';

// ── 접근 허용(전직원) ──────────────────────────────────────────
// PageResponse<TaskSummaryResponse, Void> 봉투 - createPagedList로 소비한다.
// TaskSummaryResponse: {id, ticketId, alias, title, contentType, recurrenceType, dueDate,
// status:'PENDING'|'COMPLETE'|'FAIL', response, completedAt, createdAt, updatedAt}
export const getTasks = (storeId, offset = 0) => get(`/stores/${storeId}/tasks`, { offset });
/** {task: TaskSummaryResponse, members: [{ticketId, alias, jobRole}]} - members는 점주 제외 직원 목록 */
export const getTask = (storeId, taskId) => get(`/stores/${storeId}/tasks/${taskId}`);
/** 담당 직원 본인이 응답을 제출해 완료 처리. 마감(dueDate)을 넘겨 제출하면 저장은 되지만 status가 FAIL이 된다.
 * response: CHECK {checked} / MEMO {memo} / PHOTO {s3FileIds} */
export const completeTask = (storeId, taskId, response) =>
	patch(`/stores/${storeId}/tasks/${taskId}/complete`, { response });

// ── 점주 전용 ────────────────────────────────────────────────
/** body: {title, contentType:'CHECK'|'MEMO'|'PHOTO', recurrenceType, ticketId(담당 직원), dueDate('YYYY-MM-DDTHH:mm:ss')}
 * 담당 직원을 바꾸려면 삭제 후 새로 만든다(재배정 API 없음). */
export const createTask = (storeId, body) => post(`/stores/${storeId}/owner/tasks`, body);
/** body: {title?, contentType?, recurrenceType?, dueDate?} - 완료된 task는 수정할 수 없다 */
export const updateTask = (storeId, taskId, body) =>
	patch(`/stores/${storeId}/owner/tasks/${taskId}`, body);
/** 아직 제출 안 된(PENDING) task만 삭제 가능 */
export const deleteTask = (storeId, taskId) => del(`/stores/${storeId}/owner/tasks/${taskId}`);
