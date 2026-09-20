/**
 * 점주의 "테스트 멤버 대리 접근". 백엔드는 점주가 X-Acting-Ticket-Id 헤더에 같은 매장의 테스트
 * 멤버(Provider.TEST) 티켓 id를 실어 보내면, 그 요청을 테스트 멤버 본인처럼 처리한다. 단 `/owner/`
 * 경로에서는 이 헤더가 있으면 400이라, client.js가 그 경로에는 헤더를 붙이지 않는다.
 * 새로고침해도 유지되도록 탭 단위(sessionStorage)로 저장한다 - 다른 탭/재로그인엔 새지 않는다.
 */
const KEY = 'worklevel_acting';

/** @type {{storeId: number, ticketId: number, alias: string} | null} */
let acting = load();

function load() {
	try {
		const raw = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(KEY) : null;
		return raw ? JSON.parse(raw) : null;
	} catch {
		return null;
	}
}

export function getActing() {
	return acting;
}

/** @param {{storeId: number, ticketId: number, alias: string} | null} next */
export function setActing(next) {
	acting = next;
	try {
		if (typeof sessionStorage === 'undefined') return;
		if (next) sessionStorage.setItem(KEY, JSON.stringify(next));
		else sessionStorage.removeItem(KEY);
	} catch {
		/* 저장 실패는 무시 - 메모리 값은 유지 */
	}
}

/** 이 요청 경로에 X-Acting-Ticket-Id를 붙여야 하면 그 값을, 아니면 null */
export function actingHeaderFor(path) {
	if (!acting) return null;
	const m = /^\/stores\/(\d+)\//.exec(path);
	if (!m || Number(m[1]) !== acting.storeId) return null;
	if (path.includes('/owner/')) return null;
	return String(acting.ticketId);
}
