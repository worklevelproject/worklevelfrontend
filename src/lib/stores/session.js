import { writable, derived } from 'svelte/store';
import { getStore, getMyProfile, getMyTickets } from '../api/store.js';
import { getActing, setActing } from '../api/acting.js';

const STORAGE_KEY = 'worklevel_store_id';

function createSessionStore() {
	const { subscribe, set, update } = writable({
		ready: false, // 최초 로드 시도가 끝났는지
		storeId: /** @type {number | null} */ (null),
		storeName: '',
		ticketId: /** @type {number | null} */ (null),
		alias: '',
		jobRole: /** @type {'OWNER' | 'MANAGER' | 'STAFF' | null} */ (null),
		// 점주가 테스트 멤버로 대리 접근 중이면 그 멤버의 alias(아니면 null). 이때 ticketId/alias/jobRole은
		// 테스트 멤버 것(STAFF)이라 직원 화면이 그대로 동작한다 - 점주 본인 값은 exitActing()이 복원한다.
		acting: /** @type {string | null} */ (null),
		// 개인정보 수집·이용 동의 여부(회원 단위, GET /stores/{id}/me의 privacyConsented). 직원 화면 진입 가드용
		privacyConsented: false
	});

	async function loadFromStorage() {
		const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
		if (!saved) {
			set({ ready: true, storeId: null, storeName: '', ticketId: null, alias: '', jobRole: null, acting: null, privacyConsented: false });
			return;
		}
		await selectStore(Number(saved));
	}

	/** 매장을 고르거나(가입/생성 직후) 새로고침 시 다시 불러올 때 사용 */
	async function selectStore(storeId) {
		// 다른 매장으로 들어가면 이전 매장의 대리 접근은 끊는다(헤더는 그 매장 경로에만 붙지만 화면 상태도 맞춘다)
		if (getActing() && getActing()?.storeId !== storeId) setActing(null);
		try {
			let store, me;
			try {
				[store, me] = await Promise.all([getStore(storeId), getMyProfile(storeId)]);
			} catch (e) {
				// 저장돼 있던 테스트 멤버가 사라졌거나 점주가 아니게 된 경우 - 대리 접근을 풀고 본인으로 재시도
				if (!getActing()) throw e;
				setActing(null);
				[store, me] = await Promise.all([getStore(storeId), getMyProfile(storeId)]);
			}
			if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, String(storeId));
			set({
				ready: true,
				storeId,
				storeName: store.name,
				ticketId: me.ticketId,
				alias: me.alias,
				jobRole: me.jobRole ?? null,
				acting: getActing() ? me.alias : null,
				privacyConsented: !!me.privacyConsented
			});
		} catch (e) {
			if (typeof localStorage !== 'undefined') localStorage.removeItem(STORAGE_KEY);
			set({ ready: true, storeId: null, storeName: '', ticketId: null, alias: '', jobRole: null, acting: null, privacyConsented: false });
			throw e;
		}
	}

	/** 점주가 같은 매장의 테스트 멤버로 대리 접근을 시작한다(이후 /owner 밖의 모든 요청이 그 멤버로 처리됨) */
	async function enterActing(/** @type {{ticketId: number, alias: string}} */ member) {
		const storeId = /** @type {number} */ (getStoreId());
		setActing({ storeId, ticketId: member.ticketId, alias: member.alias });
		await selectStore(storeId);
		// selectStore는 대리 접근 프로필 조회가 실패하면 본인으로 되돌려 재시도하므로, 여기서 풀려 있으면 실패다
		if (!getActing()) throw new Error('테스트 멤버로 들어갈 수 없어요');
	}

	/** 대리 접근을 끝내고 점주 본인으로 돌아간다 */
	async function exitActing() {
		const storeId = getStoreId();
		setActing(null);
		if (storeId) await selectStore(storeId);
	}

	function getStoreId() {
		let id = null;
		subscribe((v) => (id = v.storeId))();
		return id;
	}

	function clear() {
		setActing(null);
		if (typeof localStorage !== 'undefined') localStorage.removeItem(STORAGE_KEY);
		set({ ready: true, storeId: null, storeName: '', ticketId: null, alias: '', jobRole: null, acting: null, privacyConsented: false });
	}

	/** 개인정보 수집·이용에 동의한 직후 가드가 다시 막지 않게 세션에도 반영한다 */
	function markPrivacyConsented() {
		update((v) => ({ ...v, privacyConsented: true }));
	}

	return { subscribe, loadFromStorage, selectStore, enterActing, exitActing, clear, update, markPrivacyConsented };
}

export const session = createSessionStore();

// jobRole 세 종류(OWNER/MANAGER/STAFF) 중 이 포팅에서는 OWNER만 "사장님 화면", 나머지는
// "직원 화면"으로 단순화했다 — 프로토타입 자체가 역할을 owner/staff 둘로만 나눴기 때문.
// 매니저 전용 권한 세분화(팀·권한 설정 화면)는 목업으로만 남아 있다.
export const isOwner = derived(session, ($s) => $s.jobRole === 'OWNER');

/**
 * 로그인 직후(또는 "매장 전환" 진입) 어디로 보낼지 GET /stores/me/tickets 개수로 정한다.
 * 티켓이 없으면 온보딩(매장 생성), 하나뿐이면 그 매장으로 바로 들어가고, 여러
 * 개면 온보딩 화면이 그 목록을 보여주며 고르게 한다(하나만 있을 때만 여기서 selectStore까지
 * 처리 — 여러 개일 땐 어느 걸 고를지 이 함수가 알 수 없으므로 온보딩 화면에 맡긴다).
 * @returns {Promise<string>} goto할 경로
 */
export async function resolveEntryPath() {
	const tickets = await getMyTickets();
	if (!tickets.length) return '/onboarding';
	if (tickets.length === 1) {
		await session.selectStore(tickets[0].storeId);
		return tickets[0].jobRole === 'OWNER' ? '/owner/today' : '/staff/today';
	}
	return '/onboarding';
}
