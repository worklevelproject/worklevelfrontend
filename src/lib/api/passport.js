import { get, patch } from './client.js';

// 회원 단위(매장 무관) workPassport API. 퇴사 확정(APPROVED)된 건만 존재한다.
/** 내 workPassport 전체(공개/비공개 무관) - 공개 여부를 바꿀 대상을 고를 때 씀 */
export const getMyPassports = () => get('/members/me/passports');
/** 다른 회원이 공개로 설정한 workPassport만. 로그인만 하면 누구나 호출 가능(권한 제약은 화면 진입 경로에서 건다) */
export const getPublicPassports = (memberId) => get(`/members/${memberId}/passports`);
export const setPassportPublic = (resignationProcessId, isPublic) =>
	patch(`/members/me/passports/${resignationProcessId}/public`, { isPublic });
