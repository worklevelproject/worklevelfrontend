import { writable, get } from 'svelte/store';

/**
 * accessToken은 메모리에만 둔다(localStorage 저장 안 함 — XSS 시 탈취 위험 줄이려는 목적).
 * 그래서 새로고침하면 사라지는데, refreshToken이 httpOnly 쿠키로 남아있어
 * client.js의 401 인터셉터가 /auth/refresh로 자동 재발급받는다.
 */
export const accessToken = writable(/** @type {string | null} */ (null));

export function setAccessToken(token) {
	accessToken.set(token);
}

export function getAccessToken() {
	return get(accessToken);
}

export function clearAccessToken() {
	accessToken.set(null);
}
