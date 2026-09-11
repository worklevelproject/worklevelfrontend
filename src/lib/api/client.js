import { getAccessToken, setAccessToken, clearAccessToken } from './token.js';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

export class ApiError extends Error {
	/**
	 * @param {number} status
	 * @param {any} body
	 */
	constructor(status, body) {
		super((body && (body.message || body.error)) || `API 요청 실패 (status ${status})`);
		this.status = status;
		this.body = body;
	}
}

let refreshPromise = null;

/** refreshToken 쿠키로 accessToken을 새로 받아온다. 여러 요청이 동시에 401을 맞아도 한 번만 호출한다. */
function refreshAccessToken() {
	if (!refreshPromise) {
		refreshPromise = fetch(`${API_BASE_URL}/auth/refresh`, {
			method: 'POST',
			credentials: 'include'
		})
			.then(async (res) => {
				if (!res.ok) throw new ApiError(res.status, await safeJson(res));
				const data = await res.json();
				setAccessToken(data.accessToken);
				return data.accessToken;
			})
			.finally(() => {
				refreshPromise = null;
			});
	}
	return refreshPromise;
}

async function safeJson(res) {
	try {
		return await res.json();
	} catch {
		return null;
	}
}

/**
 * 공통 fetch 래퍼. Authorization 헤더를 자동으로 붙이고, 401이면 /auth/refresh로 한 번
 * 재시도한다. 그래도 실패하면 세션을 지우고 로그인 화면으로 보낸다.
 * @param {string} path  "/stores/1/works" 처럼 API_BASE_URL 뒤에 붙는 경로
 * @param {{method?:string, body?:any, params?:Record<string,any>, isRetry?:boolean}} [opts]
 */
export async function apiFetch(path, opts = {}) {
	const { method = 'GET', body, params, isRetry = false } = opts;

	let url = `${API_BASE_URL}${path}`;
	if (params) {
		const qs = new URLSearchParams();
		for (const [k, v] of Object.entries(params)) {
			if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
		}
		const s = qs.toString();
		if (s) url += (url.includes('?') ? '&' : '?') + s;
	}

	const headers = {};
	const token = getAccessToken();
	if (token) headers['Authorization'] = `Bearer ${token}`;
	if (body !== undefined) headers['Content-Type'] = 'application/json';

	const res = await fetch(url, {
		method,
		headers,
		credentials: 'include', // /auth/refresh 쿠키 전송용
		body: body !== undefined ? JSON.stringify(body) : undefined
	});

	if (res.status === 401 && !isRetry && path !== '/auth/refresh') {
		try {
			await refreshAccessToken();
			return apiFetch(path, { ...opts, isRetry: true });
		} catch {
			clearAccessToken();
			if (typeof window !== 'undefined') {
				window.location.href = '/login';
			}
			throw new ApiError(401, { message: '로그인이 만료됐어요' });
		}
	}

	if (res.status === 204) return null;

	const contentType = res.headers.get('content-type') || '';
	const data = contentType.includes('application/json') ? await safeJson(res) : null;

	if (!res.ok) {
		throw new ApiError(res.status, data);
	}
	return data;
}

export const get = (path, params) => apiFetch(path, { method: 'GET', params });
export const post = (path, body) => apiFetch(path, { method: 'POST', body });
export const patch = (path, body) => apiFetch(path, { method: 'PATCH', body });
export const put = (path, body) => apiFetch(path, { method: 'PUT', body });
export const del = (path) => apiFetch(path, { method: 'DELETE' });
