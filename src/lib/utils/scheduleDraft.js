import { addDays, dowIdx } from './date.js';
import { TIME_TYPE } from './labels.js';

/**
 * v8 프로토타입(worlvprototypenewvesionsrc/web4-s8.js)의 genDraft()를 실제 백엔드 응답 위에서
 * 동작하는 순수 함수로 포팅한 것. localStorage 대신 이미 fetch된 배열을 인자로 받는다.
 * 백엔드에 "자동 배정" 도메인이 따로 없으므로, 이 결과는 그대로 owner/works(POST)로 보낼 수 있는
 * 안(案)일 뿐이다 - 사람이 드롭/교체/공백채우기로 고친 다음 확정한다.
 *
 * 프로토타입의 휴가(leave) 차단 필터는 백엔드에 휴가 도메인이 없어 뺐다(docs/KNOWN_GAPS.md #2-2).
 * 직원 "되는 시간" 제출 API도 백엔드에서 삭제돼(#4be1f33) 그 제출 여부·선호 시간대는 더 반영하지 않는다.
 * 한 슬롯에 한 명만 배정한다(minCover 여러 명 동시 배정은 이번 포팅 범위 밖).
 *
 * @param {object} input
 * @param {string} input.nextMonday - 초안을 만들 주의 월요일(YYYY-MM-DD)
 * @param {any} input.currentWeekSchedule - getOwnerWeeklySchedule(storeId, 이번주 월요일) 응답
 * @param {any[]} input.timeTemplates - getTemplates(storeId) 응답(시간대별 시작/종료 시각)
 * @param {any[]} input.employeeStats - getEmployeeStats(storeId, true) 응답의 content(활성 직원)
 */
export function buildScheduleDraft({ nextMonday, currentWeekSchedule, timeTemplates, employeeStats }) {
	const skeleton = buildSkeleton(currentWeekSchedule, timeTemplates);
	const activeEmployees = employeeStats.filter((e) => e.active !== false);

	/** @type {Record<number, number>} 이 초안 안에서 직원별 누적 배정 분(0에서 시작) */
	const assignedMinutes = {};
	/** @type {Record<number, Set<string>>} 직원별 배정된 날짜(6일 연속 체크용) */
	const assignedDates = {};
	/** @type {Record<string, Set<number>>} 날짜별 이미 배정된 직원(같은 날 중복 방지) */
	const busyByDate = {};

	const items = [];
	const gaps = [];

	for (const slot of skeleton) {
		const date = addDays(nextMonday, slot.dow);
		const durationMin = minutesBetween(slot.startTime, slot.endTime);
		const candidates = rankCandidates(slot, date, activeEmployees, {
			assignedMinutes,
			assignedDates,
			busyByDate
		});

		if (candidates.length === 0) {
			gaps.push({ date, dow: slot.dow, startTime: slot.startTime, endTime: slot.endTime, label: slot.label, reason: gapReason(slot, date, activeEmployees, busyByDate) });
			continue;
		}

		const picked = candidates[0];
		items.push({
			date,
			ticketId: picked.ticketId,
			alias: picked.alias,
			startTime: slot.startTime,
			endTime: slot.endTime,
			label: slot.label,
			timeType: slot.timeType,
			reason: picked.reason
		});

		assignedMinutes[picked.ticketId] = (assignedMinutes[picked.ticketId] || 0) + durationMin;
		(assignedDates[picked.ticketId] ??= new Set()).add(date);
		(busyByDate[date] ??= new Set()).add(picked.ticketId);
	}

	const risks = buildRisks(assignedMinutes, assignedDates, activeEmployees);
	const laborMinutesTotal = Object.values(assignedMinutes).reduce((a, b) => a + b, 0);

	return { items, gaps, risks, laborMinutesTotal };
}

/** 이번 주 확정 근무를 요일별 반복 패턴으로 요약한다. 근무가 하나도 없으면(신규 매장 등) 매장의
 * 시간대 템플릿 하나당 하루 한 슬롯씩(요일 구분 없이 매일) 최소한의 뼈대로 대체한다. */
function buildSkeleton(currentWeekSchedule, timeTemplates) {
	const days = currentWeekSchedule?.days ?? [];
	const fromHistory = days.flatMap((d) =>
		d.works.map((w) => ({
			dow: dowIdx(d.date),
			startTime: w.startTime.slice(11, 16),
			endTime: w.endTime.slice(11, 16),
			label: `${TIME_TYPE[w.timeType] ?? '보통'} 근무`,
			priorTicketIds: w.workers.map((p) => p.ticketId),
			timeType: w.timeType ?? null
		}))
	);
	if (fromHistory.length > 0) return fromHistory;

	return (timeTemplates ?? []).flatMap((t) =>
		Array.from({ length: 7 }, (_, dow) => ({
			dow,
			startTime: t.startTime.slice(0, 5),
			endTime: t.endTime.slice(0, 5),
			label: `${TIME_TYPE[t.timeType] ?? t.timeType} 근무`,
			priorTicketIds: [],
			timeType: t.timeType
		}))
	);
}

function rankCandidates(slot, date, employees, ctx) {
	const busyToday = ctx.busyByDate[date] ?? new Set();

	return employees
		.filter((e) => !busyToday.has(e.ticketId))
		.filter((e) => (ctx.assignedMinutes[e.ticketId] || 0) + minutesBetween(slot.startTime, slot.endTime) <= 40 * 60)
		.map((e) => {
			const wasHere = slot.priorTicketIds.includes(e.ticketId);
			return {
				ticketId: e.ticketId,
				alias: e.alias,
				onTimeRate: e.onTimeRate ?? 0,
				minutes: ctx.assignedMinutes[e.ticketId] || 0,
				wasHere,
				reason: draftReason({ wasHere, minutes: ctx.assignedMinutes[e.ticketId] || 0 })
			};
		})
		.sort((a, b) => {
			if (a.wasHere !== b.wasHere) return a.wasHere ? -1 : 1;
			if (a.minutes !== b.minutes) return a.minutes - b.minutes;
			return b.onTimeRate - a.onTimeRate;
		});
}

function draftReason({ wasHere, minutes }) {
	const bits = [];
	if (wasHere) bits.push('지난주에도 이 시간 담당');
	bits.push(`다음 주 누적 ${(minutes / 60).toFixed(1)}h`);
	return bits.join(' · ');
}

function gapReason(slot, date, employees, busyByDate) {
	const busyToday = busyByDate[date] ?? new Set();
	if (employees.every((e) => busyToday.has(e.ticketId))) return '그 날 남는 직원이 없어요';
	return '40시간을 넘기지 않고 배정할 사람이 없어요';
}

function buildRisks(assignedMinutes, assignedDates, employees) {
	const risks = [];
	for (const e of employees) {
		const minutes = assignedMinutes[e.ticketId] || 0;
		const days = assignedDates[e.ticketId]?.size || 0;
		if (minutes > 0 && minutes < 15 * 60) risks.push({ ticketId: e.ticketId, alias: e.alias, type: 'under15', detail: `주휴수당 기준(15h) 미만 · ${(minutes / 60).toFixed(1)}h` });
		if (minutes > 40 * 60) risks.push({ ticketId: e.ticketId, alias: e.alias, type: 'over40', detail: `40시간 초과 · ${(minutes / 60).toFixed(1)}h` });
		if (days >= 6) risks.push({ ticketId: e.ticketId, alias: e.alias, type: 'sixDays', detail: `${days}일 연속 근무` });
	}
	return risks;
}

function minutesBetween(hhmmStart, hhmmEnd) {
	const [sh, sm] = hhmmStart.split(':').map(Number);
	const [eh, em] = hhmmEnd.split(':').map(Number);
	return eh * 60 + em - (sh * 60 + sm);
}

/** confirmDraft: 초안 항목들을 owner/works 배치 생성 요청 모양으로 바꾼다(그대로 createWorks에 전달). */
export function draftItemsToCreateWorksRequests(items) {
	return items.map((it) => ({
		timeType: it.timeType || 'NORMAL',
		startTime: `${it.date}T${it.startTime}:00`,
		endTime: `${it.date}T${it.endTime}:00`,
		participantTicketIds: [it.ticketId]
	}));
}
