# 화면 ↔ 백엔드 API 매핑

작성 기준일: 2026-09-13. 프론트 디자인 기준을 `worlvprototypenewvesionsrc/`(v8 프로토타입, 점주
메뉴 10개→4개 개편 + 자동 근무표 초안/되는 시간 제출률 신규)로 갱신하고, 같은 날짜의
worklevelbackend 최신 커밋(`10d2d52`, PR #39까지)까지 다시 맞춰 정리했다. 09-11/12 작성분 대비
바뀐 점: (1) 거의 모든 목록 조회 API가 offset 페이징 + 봉투 응답으로 바뀜(아래 "공통: 목록 조회
페이징" 참고), (2) 직원 본인 출퇴근 이력 조회 API가 새로 생겨 `KNOWN_GAPS.md`의 옛 #2가 해소됨,
(3) 화면 구조가 v8 프로토타입의 4메뉴(오늘/근무/직원/매장)를 따르도록 재편됨, (4) 자동 근무표
초안·되는 시간 제출률 카드가 새로 생김(둘 다 신규 백엔드 도메인 없이 기존 API로 클라이언트에서
계산). ✅ = 실제 백엔드 API로 동작, 🧪 = 브라우저에만 저장되는 목업, ⛔ = 아예 만들지 않음.

## 공통: 목록 조회 페이징

Task/Notice/HandOver/Alarm/Work/WorkRequest/ManualItem/직원 통계(EmployeeStats)를 포함해 거의 모든
목록 조회 API가 `offset`(정수, 기본 0) 쿼리 파라미터만 받고, `limit`은 서버가 도메인별로 10으로
고정해뒀다(클라이언트가 지정 불가). 응답은 모두 같은 봉투 형태다.

```
{ content: T[], search: S, offset: number, limit: number, totalCount: number, hasNext: boolean }
```

`search`는 그 호출에 실제 적용된 필터 값을 그대로 돌려준다(필터가 없으면 `search`는 의미 없는
값/생략). `hasNext = offset + content.length < totalCount`. 프론트는 `lib/utils/pagedList.js` 공용
헬퍼로 `{offset, items, hasNext}` 상태를 관리하고, 목록 하단에 "더보기" 버튼을 둬서 `hasNext`일 때만
노출한다(무한스크롤·페이지번호 아님 — 소규모 매장 도구 특성상 대부분 첫 페이지 안에서 끝남). 이
문서의 각 API 행에서는 페이징 여부를 반복해서 적지 않는다. `owner/employees/stats`는 실질적으로
한 페이지짜리(offset 파라미터 자체가 없음)지만 응답 봉투는 동일하게 감싸져 있으니 `.content`
언랩은 여전히 필요하다.

## 인증 · 매장 연결

| 화면 | 상태 | 연동 API | 차이 |
|---|---|---|---|
| 로그인 | ✅ | `GET /oauth2/authorization/kakao` → 카카오 → `/login/oauth2/code/kakao` | v8 프로토타입은 로그인 버튼을 카카오톡/구글로 그렸지만 `doSocial()`이 실제 API를 호출하지 않는 순수 장식 화면이다. 백엔드는 카카오만 있고 구글 OAuth는 없어서, 프론트도 카카오 버튼만 유지하고 구글 버튼은 추가하지 않는다 |
| 매장 만들기/참여 | ✅ | `POST /stores`, `POST /stores/join` | 새 화면(프로토타입엔 없던 온보딩) — 초대코드로 가입한 직후 storeId를 알려주는 API가 없어서, 가입 후 storeId를 직접 입력받는 임시 단계가 끼어 있음(`KNOWN_GAPS.md` #1) |

## 점주 화면 (`/owner/*`) — v8 4메뉴 구조

라우트 경로 자체는 그대로 두고(`/owner/shifts`, `/owner/attendance` 등 URL 불변), SvelteKit 라우트
그룹 + 공용 탭 레이아웃으로 아래 4개 메뉴 아래에 묶는다.

### 오늘

| 화면 | 상태 | 연동 API | 차이 |
|---|---|---|---|
| 오늘 | ✅ | `GET .../owner/dashboard/attendance`, `GET .../owner/work-requests/attendance-corrections`, `GET .../owner/work-requests?status=REJECT`, `GET .../owner/employees/stats`, `GET .../notices`, `GET .../hand-overs`, `GET .../owner/works/salary` | 매출 카드만 🧪 목업(`lib/stores/mock.js`, 매출 도메인 없음). 공지·마감 노트·이번 달 급여 예상 카드는 실제 API |
| ㄴ 다음 주 근무표 상태 카드(신규) | ✅ | `GET .../owner/works/weekly`(다음 주 월요일 기준 호출) | 신규 API 없이 기존 근무표 조회 재사용. 비어있음/대기중/확정 3상태는 클라이언트에서 계산 |
| ㄴ 되는 시간 제출률 배너(신규) | ✅(범위 한계 있음) | `GET .../owner/available-times/weekly` | 활성 직원 중 해당 주에 하루라도 제출한 비율을 클라이언트에서 계산. **한계**: 이 API가 항상 "호출 시점 기준 이번 주"만 반환해서, 다음 주 제출이 진행 중인 시점엔 정확히 그 주를 못 봄(`KNOWN_GAPS.md` 신규 항목) |

### 근무 (근무표 + 출퇴근)

| 화면 | 상태 | 연동 API | 차이 |
|---|---|---|---|
| 근무표 | ✅ | `GET .../owner/works/weekly`, `POST .../owner/works`, `PATCH/DELETE .../owner/works/{id}` | 프로토타입의 매트릭스뷰·월간캘린더뷰는 생략(주간 보드뷰만) |
| 출퇴근 | ✅ | `GET .../owner/dashboard/attendance`, 정정 승인/거절 API | 점주가 대신 출근/퇴근 처리하던 기능은 삭제 — 실제 출퇴근은 본인만 가능(백엔드 제약) |
| 자동 근무표 초안(신규) | ✅(클라이언트 로직) | `GET .../owner/works/weekly`, `GET .../owner/available-times/weekly`, `GET .../owner/employees/stats`, 확정 시 `POST .../owner/works` | 백엔드에 대응 도메인 없음 — `lib/utils/scheduleDraft.js`가 세 API 응답을 조합해 순수 클라이언트 휴리스틱으로 후보 배정을 계산(랭킹: 지난주 동일인 → 다음주 제출 여부 → 가능시간 선호도 → 누적시간 → 정시출근율, 위험플래그: 15h 미만/40h 초과/6일 연속). 프로토타입의 휴가(leave) 차단 필터는 백엔드에 휴가 도메인이 없어 제외. "확정"은 기존 `createWorks`(배치 생성) 그대로 호출 |

### 직원 (직원 + 급여)

| 화면 | 상태 | 연동 API | 차이 |
|---|---|---|---|
| 직원 | ✅ | `GET .../owner/employees/stats`, `GET .../owner/invite-code` | |
| 직원 상세 | ✅ | `GET/PATCH .../owner/employees/{ticketId}`, `GET /tickets/{ticketId}/contract-documents`, `DELETE .../owner/employees/{ticketId}`, `GET .../owner/works/salary` | 서류는 목록(만료일)만 — 파일 등록/열람은 직원 본인만 가능(백엔드 권한 설계) |
| 급여 | ✅(공제만 추정) | `GET .../owner/works/salary` | 직원별 이번달 실제 수당(기본·야간·휴일)·주휴수당 합계를 그대로 보여줌(`totalPay + weeklyAllowanceAmount`로 합산 — 이미 정확히 반영돼 있음, 확인 완료). 공제(3.3%/4대보험)만 백엔드 도메인이 없어 `lib/utils/payroll.js`의 `deductionFor`로 브라우저 설정을 따름 |
| 사람 구하기(보조 링크) | 🧪 | 없음 | 직원 화면 안쪽 링크로 데모용 유지, 매출 도메인처럼 백엔드 지원 없음 |

### 매장 (할 일 + 공지·인수인계 + 레시피 + 매출)

| 화면 | 상태 | 연동 API | 차이 |
|---|---|---|---|
| 할 일 | ✅ | `GET .../tasks`, `GET .../tasks/{id}`, `POST/PATCH/DELETE .../owner/tasks`, `POST .../owner/tasks/{taskId}/responses`(배정), `PATCH .../tasks/{taskId}/responses/{id}/complete`(직원 완료) | work-response(근무별 보고 + 승인/반려)가 사라지고, 근무와 무관한 별도 할 일(Task) + 담당자 배정 방식. 승인/반려 단계 없이 담당 직원이 스스로 완료 처리 |
| 공지 · 인수인계 | ✅ | `GET .../notices`, `GET .../notices/{id}`, `POST/PATCH/DELETE .../owner/notices`; `GET .../hand-overs`, `POST/PATCH/DELETE .../hand-overs/{id}` | 목업에서 실제 API로 교체. pin·읽음 추적 필드는 백엔드에 없어 빠짐. 마감(CLOSE) 근무 1건당 인수인계 1개만 가능(백엔드 제약) |
| 레시피 | ✅ | `GET/POST/PATCH/DELETE .../manual-items` (category=RECIPE) | 메뉴 사진 업로드는 미연결(CDN 관련 `KNOWN_GAPS.md`). 버전(v)·"안 본 직원" 추적 없음 |
| 매출 | 🧪 | 없음 | 매출 도메인 없음 |

### 그 외 (메뉴 그룹 밖)

| 화면 | 상태 | 연동 API | 차이 |
|---|---|---|---|
| 퇴사 처리 | ⛔ (만들지 않음) | `DELETE .../owner/employees/{ticketId}`만 있음 | 프로토타입의 3단계 평가·직원확인 플로우에 대응하는 API가 없어 화면 자체를 만들지 않았고, 직원 상세의 "내보내기" 버튼(티켓 비활성화)만 제공 |
| 알림 | ✅ | `GET .../alarms`, `GET .../alarms/{id}` | |
| 설정 · 매장 정보 | ✅ | `GET/PATCH .../owner/config` | |
| 설정 · 근무 시간대 | ✅ | `GET/PUT .../owner/time-templates` | |
| 설정 · 근무 운영 설정 | ✅ | `GET/PUT .../owner/time-config` | |
| 설정 · 급여 규칙 | 🧪 | 없음 | |
| 설정 · 알림 | 🧪 | 없음 | 알림 발송 자체(outbox/RabbitMQ)는 있지만, 항목별 on/off 설정 API는 없음 |
| 설정 · 팀/권한 | ⛔(만들지 않음) | 없음 | 매니저 세부 권한 개념이 백엔드에 없음 |
| 설정 · 요금제 | ⛔(만들지 않음) | 없음 | 베타 단계라 과금 개념 없음 |
| 설정 · 계정 | ✅ | `DELETE /members/me`(탈퇴), 로그아웃 | |

## 직원 화면 (`/staff/*`)

| 화면 | 상태 | 연동 API | 차이 |
|---|---|---|---|
| 오늘 | ✅ | `GET .../work-requests/mine`, `POST .../work-requests/{id}/accept\|reject`, `POST .../works/{id}/check-in\|check-out`, `GET .../attendances/mine`(신규) | 체크인/체크아웃 직후 낙관적 갱신은 그대로 두되, 로드 시 `GET .../attendances/mine`(오늘 날짜)을 진실 소스로 조회해 새로고침해도 상태가 유지되도록 함(`KNOWN_GAPS.md` 옛 #2 해소) |
| 근무표 | ✅ | `GET .../works?year=&month=` | 동료 이름/배정 여부는 안 보임(myStatus만 제공) — API 제약 |
| 다음 주 되는 시간 | ✅ | `GET .../available-times/me`, `PUT .../available-times` | 프로토타입의 "좋아요/돼요/안돼요" 3단계 선호도는 없고 가능/불가능 2단계만 |
| 할 일 | ✅ | `GET .../tasks`(내게 배정된 것만 클라이언트에서 필터), `PATCH .../tasks/{taskId}/responses/{id}/complete` | 승인/반려 없이 직원이 스스로 완료 처리 |
| 내 급여 | ✅(공제만 추정) | `GET .../works/salary/mine` | 이번달 실제 수당·주휴수당 합계(`totalPay + weeklyAllowanceAmount`). 공제만 브라우저 설정 추정 |
| 공지 | ✅ | `GET .../notices`, `GET .../notices/{id}` | |
| 레시피 | ✅ | `GET .../manual-items` | |
| 내 정보 | ✅ | `GET .../me`, `PATCH .../alias`, `GET/POST /tickets/{id}/contract-documents`, `GET .../attendances/mine`(신규) | "최근 근무" 목록에 이제 실제 체크인/아웃 시각·근무 상태를 표시(예전엔 예정 시각만 가능했음 — `KNOWN_GAPS.md` 옛 #2 해소) |
| 알림 | ✅ | | |
| 설정 | 🧪(부분) | 로그아웃/탈퇴만 실제 | |

## 공통 인프라

| 항목 | 상태 | 비고 |
|---|---|---|
| S3 업로드(presign) | ✅ | `lib/api/s3file.js` |
| PROTECTED 파일 열람(CDN) | ⛔ | CDN 호스트가 설정 어디에도 없어서, 업로드는 되지만 실제로 보여주는 `<img>` 연결은 하지 않음 |
| StoreAccessFilter 통합 | (내부 리팩터링) | `StoreOwnerFilter`를 `StoreAccessFilter`로 통합하고 본인 데이터 조회를 storeId+memberId 대신 ticketId 기반으로 전환한 것은 백엔드 내부 구현 변경일 뿐, URL·요청 파라미터·응답 형태·권한 범위에는 영향 없음 — 프론트 코드 변경 불필요 |
