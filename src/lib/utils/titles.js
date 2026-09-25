// worklevel-src의 TITLES 매핑을 경로 기반으로 옮김.
export const TITLES = {
	'/owner/today': '오늘',
	'/owner/shifts': '근무표',
	'/owner/attendance': '출퇴근',
	'/owner/tasks': '할 일',
	'/owner/notices': '공지 · 인수인계',
	'/owner/staff': '직원',
	'/owner/payroll': '급여',
	'/owner/talent': '사람 구하기',
	'/owner/recipes': '레시피',
	'/owner/sales': '매출',
	'/owner/notifications': '알림',
	'/owner/settings': '설정',
	'/staff/today': '오늘',
	'/staff/schedule': '근무표',
	'/staff/tasks': '할 일',
	'/staff/pay': '내 급여',
	'/staff/welcome': '개인정보 입력',
	'/staff/notices': '공지 · 인수인계',
	'/staff/recipes': '레시피',
	'/staff/me': '내 정보',
	'/staff/notifications': '알림',
	'/staff/mypage': '마이페이지',
	'/staff/settings': '설정'
};

export function titleFor(pathname) {
	if (TITLES[pathname]) return TITLES[pathname];
	// /owner/staff/12 처럼 동적 세그먼트가 붙은 경로는 접두사로 매칭
	const match = Object.keys(TITLES)
		.filter((k) => pathname.startsWith(k + '/'))
		.sort((a, b) => b.length - a.length)[0];
	return match ? TITLES[match] : '';
}
