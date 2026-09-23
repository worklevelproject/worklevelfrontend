// worklevel-src 프로토타입(03-shell-owner-pages.js seed())에서, 백엔드에 대응하는 도메인이
// 아직 없는 부분만 그대로 옮겨온 초기 목업 데이터. 매출/공지/인수인계/사람구하기/팀권한/요금제/
// 급여·출퇴근 규칙(설정값)이 여기 해당한다. 실제 도메인이 생기면 이 파일과 lib/stores/mock.js를
// 지우고 lib/api/*.js 호출로 바꾸면 된다.
import { addDays, todayISO } from '../utils/date.js';

export function seedMock() {
	const T = todayISO();

	const notices = [
		{
			id: 1,
			title: '다음 주 신메뉴 딸기 라떼 출시 · 레시피 확인 필수',
			body: '다음 주 월요일부터 판매합니다. 레시피 탭에서 v2 확인 후 확인 버튼을 눌러주세요.\n딸기청은 냉장 5일, 라벨에 개봉일 기입.',
			by: '김점주',
			at: addDays(T, -1) + ' 18:20',
			pin: true,
			readTicketIds: []
		},
		{
			id: 2,
			title: '추석 연휴 근무 가능 여부 조사',
			body: '연휴 근무 가능 여부를 되는 시간 탭에 입력해 주세요. 연휴 근무는 시급 1.5배입니다.',
			by: '김점주',
			at: addDays(T, -2) + ' 11:05',
			pin: false,
			readTicketIds: []
		}
	];

	const handovers = [
		{
			id: 1,
			by: '한유진',
			at: addDays(T, -1) + ' 22:41',
			text: '우유 8팩 남음(내일 오전 발주 필요). 2번 그라인더 분쇄도 한 칸 굵게 조정함. 제빙기 물 보충 완료.',
			photos: 1
		}
	];

	const candidates = [
		{
			id: 1,
			name: '윤채원',
			exp: '카페 경력 2년 3개월',
			months: 27,
			hours: 2140,
			self: 900,
			ontime: 98,
			jobs: ['에스프레소 머신', '마감 근무', 'POS'],
			avail: '금·토·일',
			area: '성수',
			hex: [9, 8, 8, 9, 8, 9],
			rehire: true,
			stores: ['성수 모카빈 (1년 6개월)', '연남 카페 온 (9개월)'],
			edu: ['브랜드 레시피 12종', '위생 교육 이수'],
			saved: false
		},
		{
			id: 2,
			name: '강태우',
			exp: '카페 경력 1년 4개월',
			months: 16,
			hours: 1310,
			self: 0,
			ontime: 96,
			jobs: ['에스프레소 머신', '오픈 근무'],
			avail: '평일 오픈',
			area: '서울숲',
			hex: [8, 9, 9, 7, 7, 8],
			rehire: true,
			stores: ['서울숲 라운지 (1년 4개월)'],
			edu: ['레시피 9종'],
			saved: false
		},
		{
			id: 3,
			name: '오세린',
			exp: '카페 경력 11개월',
			months: 11,
			hours: 790,
			self: 400,
			ontime: 99,
			jobs: ['홀', '마감 근무', '베이커리'],
			avail: '주말 종일',
			area: '성수',
			hex: [10, 6, 7, 8, 9, 9],
			rehire: true,
			stores: ['뚝섬 베이크 (11개월)'],
			edu: ['위생 교육 이수'],
			saved: true
		}
	];

	const sales = {};
	let sd = 7;
	const rnd = () => {
		sd = (sd * 9301 + 49297) % 233280;
		return sd / 233280;
	};
	for (let i = 45; i >= 0; i--) {
		const iso = addDays(T, -i);
		const dow = new Date(iso).getDay();
		const base = dow === 0 || dow === 6 ? 1480000 : 1080000;
		let total = Math.round((base * (0.82 + rnd() * 0.36)) / 1000) * 1000;
		const card = Math.round(total * (0.78 + rnd() * 0.08));
		const deliv = Math.round(total * (0.06 + rnd() * 0.06));
		sales[iso] = { total, card, cash: total - card - deliv, delivery: deliv, orders: Math.round(total / 6200) };
	}

	const team = [{ name: '김민아', role: '매니저', perm: ['근무표', '할 일', '레시피'] }];

	const paySettings = {
		payday: 10,
		period: '전월 1일 – 말일',
		weeklyHoliday: true,
		night: false,
		overtime: true
	};

	const attSettings = { method: 'QR', gps: 100, lateMin: 10, breakAuto: true, breakMin: 30 };

	const notifSettings = {
		shiftReply: true,
		taskDone: true,
		docExpiry: true,
		recipeSeen: false,
		email: false
	};

	const plan = 'beta';

	return { notices, handovers, candidates, sales, team, paySettings, deductByTicket: {}, attSettings, notifSettings, plan };
}
