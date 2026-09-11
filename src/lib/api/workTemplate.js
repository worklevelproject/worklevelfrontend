import { get, post, patch, del } from './client.js';

// 점주 전용. 근무 생성 화면에서 title/content를 미리 채워 넣는 용도(서버가 Work와 검증 연결은 안 함).
export const createTemplate = (storeId, body) => post(`/stores/${storeId}/owner/work-templates`, body);
export const getTemplates = (storeId) => get(`/stores/${storeId}/owner/work-templates`);
export const getTemplate = (storeId, templateId) =>
	get(`/stores/${storeId}/owner/work-templates/${templateId}`);
export const updateTemplate = (storeId, templateId, body) =>
	patch(`/stores/${storeId}/owner/work-templates/${templateId}`, body);
export const deleteTemplate = (storeId, templateId) =>
	del(`/stores/${storeId}/owner/work-templates/${templateId}`);
