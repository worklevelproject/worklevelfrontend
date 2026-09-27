import { get, post, patch, del } from './client.js';

// ── 인증 사용자 공통 ──────────────────────────────────────────
export const createStore = (body) => post('/stores', body); // {name, tel, address}
/** 로그인 회원이 가진 매장별 활성 티켓 목록. [{ticketId, storeId, storeName, jobRole, alias}]
 * 로그인 직후 화면 분기(없으면 온보딩/하나면 바로 진입/여러 개면 선택)와, 앱 안에서 다른
 * 매장·역할로 전환할 때 둘 다에 쓴다. */
export const getMyTickets = () => get('/stores/me/tickets');
/** 직원이 점주에게 받은 초대 코드로 매장에 들어간다. 응답 {ticketId, storeId, jobRole, alias} */
export const joinStore = (inviteCode) => post('/stores/join', { inviteCode });
export const getStore = (storeId) => get(`/stores/${storeId}`);
/** [{ticketId, alias, hourlyWage, availableStartTime, availableEndTime, availableDays, testMember}] - testMember=true가 점주 대리 접근 대상.
 * availableDays는 기본 근무 요일(['MONDAY',...], 미설정이면 null). availableStart/EndTime은 화면에서 더 안 쓴다. */
export const getEmployees = (storeId) => get(`/stores/${storeId}/employees`);
/** 내 ticket 정보(직무/시급/근무시작일 등). jobRole==='OWNER'면 이 매장의 점주. privacyConsented(회원 단위 개인정보 동의 여부)로 직원 화면 진입을 막는다 */
export const getMyProfile = (storeId) => get(`/stores/${storeId}/me`);
export const updateMyAlias = (storeId, alias) => patch(`/stores/${storeId}/alias`, { alias });

// ── 점주 전용 ────────────────────────────────────────────────
/** {inviteCode} - 직원에게 알려줄 매장 고정 초대 코드 */
export const getInviteCode = (storeId) => get(`/stores/${storeId}/owner/invite-code`);
export const deleteStore = (storeId) => del(`/stores/${storeId}/owner/store`);
/** 응답이 PageResponse<EmployeeStatResponse, {active}> 봉투로 오므로 호출부에서 .content를 꺼내 써야
 * 한다(offset 파라미터는 없음 - 사실상 한 페이지로 전체 직원을 준다). */
export const getEmployeeStats = (storeId, active = true) =>
	get(`/stores/${storeId}/owner/employees/stats`, { active });
export const getEmployeeDetail = (storeId, ticketId) =>
	get(`/stores/${storeId}/owner/employees/${ticketId}`);
export const removeEmployee = (storeId, ticketId) =>
	del(`/stores/${storeId}/owner/employees/${ticketId}`);
/** body: {jobRole?:'MANAGER'|'STAFF'|'PART_TIME', hourlyWage?, workStartDate?, availableDays?:DayOfWeek[], deductionType?:'TAX_3_3'|'SOCIAL_INSURANCE'|'NONE'} - 안 보낸 필드는 유지, availableDays를 []로 보내면 요일을 비운다.
 * 상세 응답엔 deductionType(실제 적용값), privacyConsented, personalInfo{realName, phone, birthDate}(동의·입력했을 때만)도 온다 */
export const updateEmployeeInfo = (storeId, ticketId, body) =>
	patch(`/stores/${storeId}/owner/employees/${ticketId}`, body);
/** 매장 이름/주소/전화번호, 수당 설정, 운영 시간대(weekdayOpenTime/weekdayCloseTime/weekendOpenTime/weekendCloseTime - 'HH:mm:ss', 미설정이면 null, 주말은 공휴일 포함) */
export const getStoreConfig = (storeId) => get(`/stores/${storeId}/owner/config`);
export const updateStoreConfig = (storeId, body) => patch(`/stores/${storeId}/owner/config`, body);
