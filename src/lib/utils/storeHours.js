import { dateOf } from './date.js';
import { getStoreConfig } from '../api/store.js';

// 매장 운영 시간대(평일 / 주말·공휴일의 여는·닫는 시각). 매장 설정(GET/PATCH .../owner/config)의
// weekdayOpenTime/weekdayCloseTime/weekendOpenTime/weekendCloseTime에 저장된다. 근무 넣기·근무 제안 칸에서는
// 시간대를 따로 고르지 않고, 이 운영 시간과 근무 시각을 비교해 요청의 timeType을 정한다(서버는 CLOSE인지만 봐서
// 마감 근무 여부 closing으로 저장한다).

/** 운영 시간을 아직 안 정한 매장에서 쓰는 기본값 */
export const DEFAULT_STORE_HOURS = {
	weekday: { open: '09:00', close: '22:00' },
	weekend: { open: '10:00', close: '22:00' }
};

const hm = (t) => (t ? String(t).slice(0, 5) : null);

/**
 * 매장 설정 응답 → {weekday, weekend, configured}. 하나라도 비어 있으면 기본값을 쓰고 configured=false.
 * @param {any} config getStoreConfig 응답
 */
export function hoursFromConfig(config) {
	const v = [config?.weekdayOpenTime, config?.weekdayCloseTime, config?.weekendOpenTime, config?.weekendCloseTime].map(hm);
	if (v.some((x) => !x)) return { ...DEFAULT_STORE_HOURS, configured: false };
	return { weekday: { open: v[0], close: v[1] }, weekend: { open: v[2], close: v[3] }, configured: true };
}

/** 점주 화면에서 운영 시간을 불러온다(못 불러오면 기본값) */
export async function loadStoreHours(storeId) {
	try {
		return hoursFromConfig(await getStoreConfig(storeId));
	} catch {
		return { ...DEFAULT_STORE_HOURS, configured: false };
	}
}

/** 토·일과 법정공휴일은 주말 운영 시간을 쓴다 */
export function isWeekendLike(iso, isHoliday = false) {
	const d = dateOf(iso).getDay();
	return isHoliday || d === 0 || d === 6;
}

/** 그 날의 운영 시간 {open, close} */
export function hoursOn(hours, iso, isHoliday = false) {
	return isWeekendLike(iso, isHoliday) ? hours.weekend : hours.weekday;
}

/**
 * 근무 시각으로 요청 timeType을 정한다. 닫는 시각까지 일하면 마감(CLOSE - 인수인계 대상), 여는 시각부터면 오픈,
 * 낮 12시 이후 시작이면 오후, 그 밖은 보통. 닫는 시각이 여는 시각보다 이르면(자정 넘겨 닫음) 자정을 넘겨 그 시각
 * 이후까지 일할 때만 마감이다.
 * @param {{open: string, close: string}} day 그 날의 운영 시간
 * @param {string} start "HH:MM"
 * @param {string} end "HH:MM" (start보다 이르거나 같으면 다음 날 종료)
 * @returns {'OPEN'|'AFTERNOON'|'CLOSE'|'NORMAL'}
 */
export function timeTypeFor(day, start, end) {
	const overnight = end <= start;
	const closesAfterMidnight = day.close <= day.open;
	const closing = closesAfterMidnight ? overnight && end >= day.close : overnight || end >= day.close;
	if (closing) return 'CLOSE';
	if (start <= day.open) return 'OPEN';
	if (start >= '12:00') return 'AFTERNOON';
	return 'NORMAL';
}
