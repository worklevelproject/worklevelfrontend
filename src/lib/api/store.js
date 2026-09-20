import { get, post, patch, del } from './client.js';

// ── 인증 사용자 공통 ──────────────────────────────────────────
export const createStore = (body) => post('/stores', body); // {name, tel, address}
/** 로그인 회원이 가진 매장별 활성 티켓 목록. [{ticketId, storeId, storeName, jobRole, alias}]
 * 로그인 직후 화면 분기(없으면 온보딩/하나면 바로 진입/여러 개면 선택)와, 앱 안에서 다른
 * 매장·역할로 전환할 때 둘 다에 쓴다. */
export const getMyTickets = () => get('/stores/me/tickets');
export const getStore = (storeId) => get(`/stores/${storeId}`);
/** [{ticketId, alias, hourlyWage, availableStartTime, availableEndTime, testMember}] - testMember=true가 점주 대리 접근 대상 */
export const getEmployees = (storeId) => get(`/stores/${storeId}/employees`);
/** 내 ticket 정보(직무/시급/근무시작일 등). jobRole==='OWNER'면 이 매장의 점주. */
export const getMyProfile = (storeId) => get(`/stores/${storeId}/me`);
export const updateMyAlias = (storeId, alias) => patch(`/stores/${storeId}/alias`, { alias });

// ── 점주 전용 ────────────────────────────────────────────────
export const deleteStore = (storeId) => del(`/stores/${storeId}/owner/store`);
/** 응답이 PageResponse<EmployeeStatResponse, {active}> 봉투로 오므로 호출부에서 .content를 꺼내 써야
 * 한다(offset 파라미터는 없음 - 사실상 한 페이지로 전체 직원을 준다). */
export const getEmployeeStats = (storeId, active = true) =>
	get(`/stores/${storeId}/owner/employees/stats`, { active });
export const getEmployeeDetail = (storeId, ticketId) =>
	get(`/stores/${storeId}/owner/employees/${ticketId}`);
export const removeEmployee = (storeId, ticketId) =>
	del(`/stores/${storeId}/owner/employees/${ticketId}`);
export const updateEmployeeInfo = (storeId, ticketId, body) =>
	patch(`/stores/${storeId}/owner/employees/${ticketId}`, body);
/** 매장 이름/주소/전화번호. {storeId, name, address, tel} */
export const getStoreConfig = (storeId) => get(`/stores/${storeId}/owner/config`);
export const updateStoreConfig = (storeId, body) => patch(`/stores/${storeId}/owner/config`, body);
