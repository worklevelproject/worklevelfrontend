import { get } from './client.js';

/**
 * date(YYYY-MM-DD)가 속한 주(월~일)의 출퇴근 항목 원본 목록. 오늘 현황/주간 통계는 프론트에서 계산.
 *
 * 서버는 다른 목록 조회와 같은 PageResponse 봉투({content, search, ...})로 내려주지만, 항상 1주
 * 범위라 offset 페이징이 없어(createPagedList 불필요) 여기서 content만 벗겨 배열로 넘긴다.
 */
export const getAttendance = async (storeId, date) => {
	const page = await get(`/stores/${storeId}/owner/dashboard/attendance`, { date });
	return page?.content ?? [];
};
