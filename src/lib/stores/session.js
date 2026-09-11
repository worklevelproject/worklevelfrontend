import { writable, derived } from 'svelte/store';
import { getStore, getMyProfile } from '../api/store.js';

const STORAGE_KEY = 'worklevel_store_id';

function createSessionStore() {
	const { subscribe, set, update } = writable({
		ready: false, // 최초 로드 시도가 끝났는지
		storeId: /** @type {number | null} */ (null),
		storeName: '',
		ticketId: /** @type {number | null} */ (null),
		alias: '',
		jobRole: /** @type {'OWNER' | 'MANAGER' | 'STAFF' | null} */ (null)
	});

	async function loadFromStorage() {
		const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
		if (!saved) {
			set({ ready: true, storeId: null, storeName: '', ticketId: null, alias: '', jobRole: null });
			return;
		}
		await selectStore(Number(saved));
	}

	/** 매장을 고르거나(가입/생성 직후) 새로고침 시 다시 불러올 때 사용 */
	async function selectStore(storeId) {
		try {
			const [store, me] = await Promise.all([getStore(storeId), getMyProfile(storeId)]);
			if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, String(storeId));
			set({
				ready: true,
				storeId,
				storeName: store.name,
				ticketId: me.ticketId,
				alias: me.alias,
				jobRole: me.jobRole ?? null
			});
		} catch (e) {
			if (typeof localStorage !== 'undefined') localStorage.removeItem(STORAGE_KEY);
			set({ ready: true, storeId: null, storeName: '', ticketId: null, alias: '', jobRole: null });
			throw e;
		}
	}

	function clear() {
		if (typeof localStorage !== 'undefined') localStorage.removeItem(STORAGE_KEY);
		set({ ready: true, storeId: null, storeName: '', ticketId: null, alias: '', jobRole: null });
	}

	return { subscribe, loadFromStorage, selectStore, clear, update };
}

export const session = createSessionStore();

// jobRole 세 종류(OWNER/MANAGER/STAFF) 중 이 포팅에서는 OWNER만 "사장님 화면", 나머지는
// "직원 화면"으로 단순화했다 — 프로토타입 자체가 역할을 owner/staff 둘로만 나눴기 때문.
// 매니저 전용 권한 세분화(팀·권한 설정 화면)는 목업으로만 남아 있다.
export const isOwner = derived(session, ($s) => $s.jobRole === 'OWNER');
