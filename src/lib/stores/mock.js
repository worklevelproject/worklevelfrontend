import { writable, get } from 'svelte/store';
import { seedMock } from '../mock/seed.js';

const KEY = 'worklevel_mock_v1';

function load() {
	if (typeof localStorage === 'undefined') return seedMock();
	try {
		const raw = localStorage.getItem(KEY);
		if (!raw) return seedMock();
		return JSON.parse(raw);
	} catch {
		return seedMock();
	}
}

export const mock = writable(load());

mock.subscribe((v) => {
	if (typeof localStorage === 'undefined') return;
	try {
		localStorage.setItem(KEY, JSON.stringify(v));
	} catch {
		/* 저장 공간 부족 등은 무시 - 데모용 목업이라 크리티컬하지 않음 */
	}
});

export function resetMock() {
	mock.set(seedMock());
}

// ── 공지 ──────────────────────────────────────────────────────
export function addNotice(title, body, pin) {
	mock.update((m) => {
		m.notices.unshift({ id: Date.now(), title, body, by: '점주', at: '방금', pin, readTicketIds: [] });
		return m;
	});
}
export function markNoticeRead(noticeId, ticketId) {
	mock.update((m) => {
		const n = m.notices.find((x) => x.id === noticeId);
		if (n && !n.readTicketIds.includes(ticketId)) n.readTicketIds.push(ticketId);
		return m;
	});
}
export function deleteNotice(noticeId) {
	mock.update((m) => {
		m.notices = m.notices.filter((x) => x.id !== noticeId);
		return m;
	});
}

// ── 인수인계 ──────────────────────────────────────────────────
export function addHandover(by, text, photos = 0) {
	mock.update((m) => {
		m.handovers.unshift({ id: Date.now(), by, at: '방금', text, photos });
		return m;
	});
}

// ── 사람 구하기 ───────────────────────────────────────────────
export function toggleSaveCandidate(id) {
	mock.update((m) => {
		const c = m.candidates.find((x) => x.id === id);
		if (c) c.saved = !c.saved;
		return m;
	});
}

// ── 매출 ──────────────────────────────────────────────────────
export function saveSalesDay(iso, data) {
	mock.update((m) => {
		m.sales[iso] = data;
		return m;
	});
}

export function getMock() {
	return get(mock);
}
