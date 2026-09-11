// esc()는 프로토타입에선 문자열 템플릿에 직접 HTML을 꽂아 넣느라 필요했지만,
// Svelte는 {expr} 보간을 기본적으로 이스케이프하므로 여기서는 불필요하다.
export const won = (n) => Math.round(n ?? 0).toLocaleString() + '원';
export const man = (n) => Math.round((n ?? 0) / 10000) + '만';
export const ini = (name) => (name ? name.slice(1) : '');

export function dur(startHM, endHM) {
	const hh = (t) => {
		const [h, m] = String(t).split(':').map(Number);
		return (h || 0) + (m || 0) / 60;
	};
	return Math.max(0, hh(endHM) - hh(startHM));
}
