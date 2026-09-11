// worklevel-src의 payFor() 그대로. 백엔드에 급여 도메인이 없어서, 실제 확정 근무시간(주 단위,
// EmployeeStatResponse.weeklyWorkMinutes 등 실제 데이터)에 이 계산만 얹는 순수 함수로 남겨뒀다.
// 근로기준법 "참고 계산"이라는 점은 프로토타입과 동일하게 문구로 안내한다.

/**
 * @param {number} weeklyHours 주 확정 근무시간
 * @param {number} nightHours 주 야간(22~06시) 근무시간
 * @param {number} wage 시급
 * @param {{weeklyHoliday:boolean, night:boolean, overtime:boolean, deduct:'3.3'|'4대'|'none'}} paySettings
 */
export function payFor(weeklyHours, nightHours, wage, paySettings) {
	const Wk = 4.3;
	const wh = weeklyHours;
	const nh = nightHours;
	const base = Math.round(wh * Wk * wage);
	const holiday = paySettings.weeklyHoliday && wh >= 15 ? Math.round((Math.min(wh, 40) / 40) * 8 * wage * Wk) : 0;
	const night = paySettings.night ? Math.round(nh * Wk * wage * 0.5) : 0;
	const over = paySettings.overtime && wh > 40 ? Math.round((wh - 40) * Wk * wage * 0.5) : 0;
	const gross = base + holiday + night + over;
	const ded =
		paySettings.deduct === '3.3' ? Math.round(gross * 0.033) : paySettings.deduct === '4대' ? Math.round(gross * 0.0945) : 0;
	return { wh, mh: +(wh * Wk).toFixed(1), base, holiday, night, over, gross, ded, net: gross - ded };
}
