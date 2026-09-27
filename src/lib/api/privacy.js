import { get, post, put } from './client.js';

/** 동의한 문구 버전 - 동의 문구(staff/welcome)를 고치면 이 값도 바꾼다 */
export const PRIVACY_CONSENT_VERSION = '2026-09-25';

// 개인정보 수집·이용 동의와 개인정보는 회원 단위라 한 매장에서 하면 모든 매장에 적용된다.
/** 응답 {privacyConsented, consentVersion, consentedAt} */
export const consentPrivacy = (storeId, consentVersion = PRIVACY_CONSENT_VERSION) =>
	post(`/stores/${storeId}/me/privacy-consent`, { consentVersion });
/** {realName, phone, birthDate} */
export const getMyPersonalInfo = (storeId) => get(`/stores/${storeId}/me/personal-info`);
/** body: {realName, phone(01X-XXXX-XXXX), birthDate:'YYYY-MM-DD'} - 동의한 뒤에만 가능 */
export const saveMyPersonalInfo = (storeId, body) => put(`/stores/${storeId}/me/personal-info`, body);
