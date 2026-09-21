// worklevel-src 프로토타입의 날짜 유틸을 그대로 옮김 (02-data-date-persistence.js 참고)
export const pad = (n) => String(n).padStart(2, '0');
export const isoOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const dateOf = (iso) => {
	const [y, m, d] = iso.split('-').map(Number);
	return new Date(y, m - 1, d);
};
export const addDays = (iso, n) => {
	const d = dateOf(iso);
	d.setDate(d.getDate() + n);
	return isoOf(d);
};
export const DOW = ['일', '월', '화', '수', '목', '금', '토'];
export const NOW = () => new Date();
export const todayISO = () => isoOf(NOW());
export const nowH = () => {
	const d = NOW();
	return d.getHours() + d.getMinutes() / 60;
};
export const mondayOf = (iso) => {
	const d = dateOf(iso);
	const k = (d.getDay() + 6) % 7;
	d.setDate(d.getDate() - k);
	return isoOf(d);
};

/** 주어진 월요일 기준 한 주(월~일)를 {iso,d,n,m} 배열로 반환 */
export function weekOf(mondayIso) {
	return Array.from({ length: 7 }, (_, i) => {
		const iso = addDays(mondayIso, i);
		const d = dateOf(iso);
		return { iso, d: DOW[d.getDay()], n: d.getDate(), m: d.getMonth() + 1 };
	});
}

export const fmt = (iso) => {
	const d = dateOf(iso);
	return `${d.getMonth() + 1}월 ${d.getDate()}일 ${DOW[d.getDay()]}`;
};
export const fmtS = (iso) => {
	const d = dateOf(iso);
	return `${d.getDate()}일 ${DOW[d.getDay()]}`;
};
export const rel = (iso) =>
	iso === todayISO() ? '오늘' : iso === addDays(todayISO(), -1) ? '어제' : iso === addDays(todayISO(), 1) ? '내일' : fmt(iso);

export const dowIdx = (iso) => (dateOf(iso).getDay() + 6) % 7;

/** "HH:MM" -> 소수 시간 */
export function hh(t) {
	if (!t) return 0;
	const [h, m] = String(t).split(':').map(Number);
	return (h || 0) + (m || 0) / 60;
}

/** ISO 문자열(LocalDateTime) -> "HH:MM" */
export function toHM(isoDateTime) {
	if (!isoDateTime) return '';
	const d = new Date(isoDateTime);
	return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** ISO 문자열(LocalDateTime) -> "오늘 18:00" / "9월 22일 화 18:00" */
export function dueLabel(isoDateTime) {
	if (!isoDateTime) return '—';
	return `${rel(isoDateTime.slice(0, 10))} ${toHM(isoDateTime)}`;
}

/** 'YYYY-MM-DD' -> 백엔드 DayOfWeek 이름('MONDAY'...) */
export const dayKeyOf = (iso) => ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'][dowIdx(iso)];
