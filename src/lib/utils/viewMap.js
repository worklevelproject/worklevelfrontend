/**
 * 점주 화면 ↔ (테스트 멤버로 보는) 직원 화면의 대응 경로. 점주가 "점주 / 테스트직원N" 사이를 오갈 때
 * 같은 종류의 화면(근무표→근무표, 공지→공지…)으로 바로 넘어가게 한다.
 */
const OWNER_TO_STAFF = {
	today: 'today',
	attendance: 'today',
	shifts: 'schedule',
	tasks: 'tasks',
	notices: 'notices',
	recipes: 'recipes',
	payroll: 'pay',
	staff: 'me',
	notifications: 'notifications',
	settings: 'settings'
};
const STAFF_TO_OWNER = {
	today: 'today',
	schedule: 'shifts',
	tasks: 'tasks',
	notices: 'notices',
	recipes: 'recipes',
	pay: 'payroll',
	me: 'staff',
	resignation: 'staff',
	notifications: 'notifications',
	settings: 'settings'
};

/**
 * @param {string} pathname 현재 경로(/owner/... 또는 /staff/...)
 * @param {'owner' | 'staff'} to 이동할 쪽
 * @returns {string} 대응하는 경로(없으면 오늘 화면)
 */
export function counterpartPath(pathname, to) {
	const seg = pathname.split('/')[2] ?? '';
	const table = to === 'staff' ? OWNER_TO_STAFF : STAFF_TO_OWNER;
	return `/${to}/${table[seg] ?? 'today'}`;
}
