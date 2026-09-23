// 급여 자체(기본/야간/휴일수당, 주휴수당)는 이제 백엔드 Cost/WeeklyAllowance 실제 계산값을
// (`lib/api/cost.js`) 그대로 쓴다. 공제(3.3%/4대보험) 도메인만 백엔드에 없어서, 그 부분만 이
// 브라우저(목업 store의 deductByTicket)에 직원별로 저장한 공제 방식을 따른다.

export const DEDUCT_LABEL = { '3.3': '3.3%', '4대': '4대보험', none: '없음' };

/**
 * 직원 한 명의 공제 방식. 점주가 직원 상세에서 정한 값이 있으면 그것, 없으면 직무 기준 기본값
 * (파트타임은 3.3%, 직원·매니저는 4대보험)을 쓴다.
 * @param {any} mockState $mock
 * @param {number} ticketId
 * @param {string | null | undefined} jobRole
 * @returns {'3.3'|'4대'|'none'}
 */
export function deductOf(mockState, ticketId, jobRole) {
	return mockState.deductByTicket?.[ticketId] ?? (jobRole === 'STAFF' || jobRole === 'MANAGER' ? '4대' : '3.3');
}

/**
 * @param {number} gross 공제 전 총 지급액(수당+주휴수당)
 * @param {'3.3'|'4대'|'none'} deduct
 */
export function deductionFor(gross, deduct) {
	const ded = deduct === '3.3' ? Math.round(gross * 0.033) : deduct === '4대' ? Math.round(gross * 0.0945) : 0;
	return { ded, net: gross - ded };
}
