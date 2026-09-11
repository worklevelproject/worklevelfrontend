import { API_BASE_URL } from './client.js';
import { setAccessToken } from './token.js';

/**
 * 새로고침 직후처럼 accessToken이 메모리에 없을 때, refreshToken 쿠키로 조용히 복구를 시도한다.
 * @returns {Promise<boolean>} 복구 성공 여부
 */
export async function tryRestoreSession() {
	try {
		const res = await fetch(`${API_BASE_URL}/auth/refresh`, { method: 'POST', credentials: 'include' });
		if (!res.ok) return false;
		const data = await res.json();
		setAccessToken(data.accessToken);
		return true;
	} catch {
		return false;
	}
}
