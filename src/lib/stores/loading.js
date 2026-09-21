import { writable } from 'svelte/store';

/** 진행 중인 전역 로딩 작업 수. 0보다 크면 LoadingOverlay가 화면을 덮는다. */
export const pending = writable(0);

/** 작업이 끝날 때까지 전역 로딩 오버레이를 유지한다(성공/실패 상관없이 정리). 겹치는 작업은
 * 카운터로 합쳐지므로 중첩 호출해도 안전하다.
 * @template T
 * @param {() => Promise<T>} fn
 * @returns {Promise<T>} */
export async function trackLoading(fn) {
	pending.update((n) => n + 1);
	try {
		return await fn();
	} finally {
		pending.update((n) => n - 1);
	}
}
