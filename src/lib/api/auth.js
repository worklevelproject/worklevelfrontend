import { API_BASE_URL, apiFetch } from './client.js';
import { clearAccessToken } from './token.js';

/**
 * 카카오 로그인 시작 주소. 백엔드가 이 주소로 리다이렉트되면 카카오 로그인 페이지로 다시
 * 리다이렉트하고, 로그인 성공 시 VITE_OAUTH2_CALLBACK_URL(=oauth2.redirect-uri, 백엔드
 * 환경변수와 반드시 일치)로 "?accessToken=..." 붙여 돌려보낸다.
 */
export function kakaoLoginUrl() {
	return `${API_BASE_URL}/oauth2/authorization/kakao`;
}

export function goToKakaoLogin() {
	window.location.href = kakaoLoginUrl();
}

/** 로그아웃: refreshToken 쿠키 기반이라 body 없이 호출, 서버가 쿠키를 만료시킨다. */
export async function logout() {
	try {
		await apiFetch('/auth/logout', { method: 'POST' });
	} finally {
		clearAccessToken();
	}
}
