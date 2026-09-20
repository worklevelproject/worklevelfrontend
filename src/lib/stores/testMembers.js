import { writable } from 'svelte/store';
import { getEmployees } from '../api/store.js';

/** 점주가 대리 접근할 수 있는 테스트 멤버 [{ticketId, alias}] - GET /stores/{id}/employees 응답의 testMember 플래그로 가린다 */
export const testMembers = writable(/** @type {{ticketId: number, alias: string}[]} */ ([]));

const lastKey = (storeId) => `worklevel_last_test_member_${storeId}`;

export async function loadTestMembers(storeId) {
	try {
		const all = await getEmployees(storeId);
		testMembers.set(
			all
				.filter((e) => e.testMember === true)
				.map((e) => ({ ticketId: e.ticketId, alias: e.alias }))
				.sort((a, b) => a.alias.localeCompare(b.alias, 'ko', { numeric: true }))
		);
	} catch {
		testMembers.set([]);
	}
}

/** 마지막으로 본 테스트 멤버 ticketId(없으면 null) */
export function getLastTestMember(storeId) {
	try {
		const v = localStorage.getItem(lastKey(storeId));
		return v ? Number(v) : null;
	} catch {
		return null;
	}
}
export function rememberTestMember(storeId, ticketId) {
	try {
		localStorage.setItem(lastKey(storeId), String(ticketId));
	} catch {
		/* 저장 실패는 무시 */
	}
}
