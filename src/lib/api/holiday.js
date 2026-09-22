import { get } from './client.js';

/**
 * from~to(YYYY-MM-DD, 둘 다 포함, 최대 366일) 기간의 날짜별 법정공휴일 여부.
 * 배열 [{date, isHoliday, holidayName}] - 토/일은 항상 isHoliday=true이고 이름이 없으면 '주말'이다.
 * 매장과 무관한 공개 API(`GET /holidays`, storeId 없음)라 인증 없이도 호출 가능하다. 아직 연 단위로
 * 적재되지 않은 해의 날짜는 스케줄러가 채우기 전까지 응답 배열에서 통째로 빠질 수 있다.
 */
export const getHolidays = (from, to) => get('/holidays', { from, to });
