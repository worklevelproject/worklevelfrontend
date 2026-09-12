// 급여 자체(기본/야간/휴일수당, 주휴수당)는 이제 백엔드 Cost/WeeklyAllowance 실제 계산값을
// (`lib/api/cost.js`) 그대로 쓴다. 공제(3.3%/4대보험) 도메인만 백엔드에 없어서, 그 부분만 이
// 브라우저 설정(paySettings.deduct)을 따르는 순수 함수로 남겨뒀다.

/**
 * @param {number} gross 공제 전 총 지급액(수당+주휴수당)
 * @param {'3.3'|'4대'|'none'} deduct
 */
export function deductionFor(gross, deduct) {
	const ded = deduct === '3.3' ? Math.round(gross * 0.033) : deduct === '4대' ? Math.round(gross * 0.0945) : 0;
	return { ded, net: gross - ded };
}
