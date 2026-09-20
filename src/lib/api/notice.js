import { get, post, patch, del } from './client.js';

// ── 접근 허용(전직원) ──────────────────────────────────────────
// PageResponse<NoticeResponse, Void> 봉투 - createPagedList로 소비한다.
/** type: 'NORMAL' | 'WORK_PROPOSAL' (생략하면 전체). WORK_PROPOSAL 공지는 slots(근무 제안 시간대)를 담고 있다. */
export const getNotices = (storeId, offset = 0, type) =>
	get(`/stores/${storeId}/notices`, { offset, type });
export const getNotice = (storeId, noticeId) => get(`/stores/${storeId}/notices/${noticeId}`);
/** 근무 제안 슬롯에 선착순 지원. 응답 {slotId, workId, workAssignmentId, capacity, appliedCount} - 지원 즉시 근무 배정이 확정된다. */
export const applyWorkProposal = (storeId, noticeId, slotId) =>
	post(`/stores/${storeId}/notices/${noticeId}/slots/${slotId}/apply`);

// ── 댓글/답글 ───────────────────────────────────────────────
// 답글은 1단계 @멘션 방식: 최상위 댓글 아래 replies[]에 평평하게 쌓이고, 답글 대상은 replyTo로 표시한다.
// 조회는 페이징 없이 전체를 한 번에 준다(최상위 댓글 배열, 각각 replies 포함).
export const getNoticeComments = (storeId, noticeId) =>
	get(`/stores/${storeId}/notices/${noticeId}/comments`);
/** body: {content(최대 1000자), replyToCommentId?} */
export const createNoticeComment = (storeId, noticeId, body) =>
	post(`/stores/${storeId}/notices/${noticeId}/comments`, body);
/** body: {content} - 본인 댓글만 */
export const updateNoticeComment = (storeId, noticeId, commentId, body) =>
	patch(`/stores/${storeId}/notices/${noticeId}/comments/${commentId}`, body);

// ── 점주 전용 ────────────────────────────────────────────────
/** body: {title, content, type?:'NORMAL'|'WORK_PROPOSAL', slots?:[{startTime, endTime, timeType?, capacity}]} */
export const createNotice = (storeId, body) => post(`/stores/${storeId}/owner/notices`, body);
export const updateNotice = (storeId, noticeId, body) =>
	patch(`/stores/${storeId}/owner/notices/${noticeId}`, body);
export const deleteNotice = (storeId, noticeId) => del(`/stores/${storeId}/owner/notices/${noticeId}`);
