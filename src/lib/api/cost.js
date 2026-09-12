import { get } from './client.js';

/** 직원 본인 이번달 누적 급여. totalPay는 주휴수당 제외, weeklyAllowanceAmount는 별도 합산 필요 */
export const getMySalary = (storeId) => get(`/stores/${storeId}/works/salary/mine`);

/** 점주용 매장 전체 이번달 지급 급여(직원별 행). 총 지급액은 클라이언트가 합산 */
export const getStoreSalary = (storeId) => get(`/stores/${storeId}/owner/works/salary`);
