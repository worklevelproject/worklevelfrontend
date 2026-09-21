import { get } from './client.js';

/**
 * from~to(YYYY-MM-DD, 둘 다 포함, 최대 366일) 기간의 날짜별 법정공휴일 여부.
 * 배열 [{date, isHoliday, holidayName}] - 토/일은 항상 isHoliday=true이고 이름이 없으면 '주말'이다.
 * 백엔드가 아직 동기화 안 된 달은 그 자리에서 공공데이터포털을 조회해 채우므로 첫 호출은 느릴 수 있다.
 */
export const getHolidays = (storeId, from, to) => get(`/stores/${storeId}/holidays`, { from, to });
