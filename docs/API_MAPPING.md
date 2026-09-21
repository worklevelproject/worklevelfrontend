# 화면 ↔ 백엔드 API 매핑

작성 기준일: 2026-09-20. worklevelbackend master(PR #55, `d2047d9`)에 맞춰 갱신했다.

**2026-09-20 동기화 요약(백엔드 `b4b7517`..`d2047d9`)**: (1) 근무 수락 프로세스가 사라지고 `WorkRequest` →
`WorkAssignment`로 바뀌었다 — `work-requests` 경로는 전부 `work-assignments`로, 근무 생성 즉시 배정이
확정돼 수락/거절/`REJECT`·`PENDING` 상태·`reject` API가 없다. (2) `Work`에서 `title/workType/content/contentType`이
빠져 근무는 시간대(`timeType`)+시각+참여자뿐이다. (3) 직원 "되는 시간"(`available-times`)·`work-templates` API 삭제 →
관련 화면(`/staff/avail`, 되는 시간 제출률 배너)과 `timeConfig.submitDeadlineDayOfWeek` 제거. (4) 공지에 근무 제안
(`WORK_PROPOSAL`, 선착순 지원 슬롯)과 댓글/답글 추가. (5) 점주의 테스트 멤버 대리 접근(`X-Acting-Ticket-Id`).
(6) 매장 수당 설정(주휴/야간/휴일 토글), 퇴사처리 `ownerComment`·`acceptRate → responseRate`.

(아래 표 중 이 요약과 어긋나는 옛 서술은 이 동기화에서 함께 고쳤다.)

이전 기준(2026-09-15, `b4b7517`, PR #44까지)의 갱신 내역:
이번 갱신에서 실제로 연결/수정한 것: (1) 구글 OAuth2 로그인(`GET /oauth2/authorization/google`) —
카카오 버튼 옆에 구글 버튼 추가, (2) 퇴사처리 프로세스(정량 지표 확인 → 사장님 평가 → 직원
확인/수정요청 → 확정) 전용 API 세트 — 기존 "내보내기"(즉시 비활성화) 버튼과는 별개 경로로 새
화면을 만듦, (3) 결근(NO_SHOW) 복구 API(`POST .../owner/work-assignments/{id}/no-show/revive`) —
점주가 출퇴근 화면에서 결근 확정 건을 되돌릴 수 있게 버튼 추가, (4) 되는 시간 제출률 API에
`nextWeek` 파라미터가 생겨 배너·자동 근무표 초안이 실제로 "다음 주" 데이터를 보도록 수정, (5)
문서만 있고 소스와 어긋나 있던 옛 기록 2건 정정(매장 생성 시 주소 필드명 `pos`→`address` 버그,
가입 직후 `TicketResponse.storeId` 오기 — `KNOWN_GAPS.md` 참고). ✅ = 실제 백엔드 API로 동작,
🧪 = 브라우저에만 저장되는 목업, ⛔ = 아예 만들지 않음.

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
| 로그인 | ✅ | `GET /oauth2/authorization/kakao` → 카카오 → `/login/oauth2/code/kakao`, `GET /oauth2/authorization/google` → 구글 → `/login/oauth2/code/google` | 백엔드에 구글 OAuth가 새로 생겨 카카오 버튼 아래 구글 버튼을 추가했다(`src/lib/api/auth.js`의 `goToGoogleLogin`). 구글은 로그인마다 동의 화면을 다시 띄워 refresh token을 갱신하지만, 프론트 입장에서는 카카오와 흐름이 동일(콜백에 accessToken 쿼리스트링)해서 별도 처리 없음 |
| 매장 만들기 | ✅ | `POST /stores` | 새 화면(프로토타입엔 없던 온보딩). 매장을 만들면 테스트 멤버 5명이 함께 생긴다. 초대코드 참여(`POST /stores/join`)는 UI에서 뺐다(직원은 테스트 멤버로 대신 본다) |
| 테스트 멤버로 보기(신규) | ✅ | `GET .../employees`(목록), 이후 `/owner`가 아닌 모든 `/stores/{id}/**` 요청에 `X-Acting-Ticket-Id: {테스트 멤버 ticketId}` 헤더 | 이 프론트는 점주 혼자 쓰는 테스트 도구라 **직원 가입 경로(초대코드 참여, 초대코드 보기)는 없앴고**, 개인 직원 화면(`/staff/*`)은 점주가 테스트 멤버(`테스트직원1~5`, `Provider.TEST`)로 대리 접근해 보는 용도로만 쓴다. 사이드바 상단 "보는 사람" 칩(`ViewSwitcher`)에서 `점주 (나)` / 테스트직원N을 한 번 클릭으로 오가고, 이때 같은 종류의 화면으로 이동한다(근무표↔근무표, 공지↔공지, 급여↔내 급여 등 — `lib/utils/viewMap.js`). 멤버가 바뀌면 화면을 새로 마운트해 그 사람 기준으로 다시 불러온다. 대리 접근 중엔 상단에 "점주로 돌아가기" 배너, 계정 탈퇴는 숨김(`/members/me`엔 헤더가 안 붙어 점주 본인 계정이 지워지므로). 헤더는 `lib/api/acting.js`가 관리해 `client.js`가 자동으로 붙이며(점주 경로 `/owner/`엔 붙이면 400이라 제외) 탭 단위 sessionStorage에 저장. 직원 목록 응답의 `testMember: true`로 가려낸다(`KNOWN_GAPS.md` #5) |

## 점주 화면 (`/owner/*`) — v8 4메뉴 구조

라우트 경로 자체는 그대로 두고(`/owner/shifts`, `/owner/attendance` 등 URL 불변), SvelteKit 라우트
그룹 + 공용 탭 레이아웃으로 아래 4개 메뉴 아래에 묶는다.

### 오늘

| 화면 | 상태 | 연동 API | 차이 |
|---|---|---|---|
| 오늘 | ✅ | `GET .../owner/dashboard/attendance`, `GET .../owner/work-assignments/attendance-corrections`, `GET .../owner/employees/stats`, `GET .../notices`, `GET .../hand-overs`, `GET .../owner/works/salary` | 매출 카드만 🧪 목업(`lib/stores/mock.js`, 매출 도메인 없음). 공지·마감 노트·이번 달 급여 예상 카드는 실제 API |
| ㄴ 다음 주 근무표 상태 카드(신규) | ✅ | `GET .../owner/works/weekly`(다음 주 월요일 기준 호출) | 신규 API 없이 기존 근무표 조회 재사용. 근무가 0건이면 "초안 만들기", 있으면 건수만 표시(수락 대기 상태는 백엔드에서 사라짐) |
| ㄴ 되는 시간 제출률 배너 | ⛔(제거) | — | 백엔드가 직원 되는 시간 API를 삭제해(`4be1f33`) 배너도 제거. "거절된 근무" 알림 카드도 수락/거절 프로세스와 함께 제거 |

### 근무 (근무표 + 출퇴근)

| 화면 | 상태 | 연동 API | 차이 |
|---|---|---|---|
| 근무표 | ✅ | `GET .../owner/works/weekly`, `POST .../owner/works`, `PATCH/DELETE .../owner/works/{id}` | 프로토타입의 매트릭스뷰·월간캘린더뷰는 생략(주간 보드뷰만). 근무 생성 요청은 `{timeType?, startTime, endTime, participantTicketIds}`뿐(제목·반복·업무내용 없음)이고 만들면 참여자에게 바로 배정된다 |
| 출퇴근 | ✅ | `GET .../owner/dashboard/attendance`, 정정 승인/거절 API, `POST .../owner/work-assignments/{id}/no-show/revive`(신규) | 점주가 대신 출근/퇴근 처리하던 기능은 삭제 — 실제 출퇴근은 본인만 가능(백엔드 제약). 결근(NO_SHOW) 확정 건은 직원이 스스로 정정을 제안할 수 없어(체크인 자체가 막힘) 점주가 출퇴근 화면에서 "결근 복구" 버튼으로 실제 출퇴근 시각을 직접 확정해 넣는다(`ReviveNoShowDrawer`) |
| 자동 근무표 초안(신규) | ✅(클라이언트 로직) | `GET .../owner/works/weekly`, `GET .../owner/time-templates`, `GET .../owner/employees/stats`, 확정 시 `POST .../owner/works` | 백엔드에 대응 도메인 없음 — `lib/utils/scheduleDraft.js`가 API 응답을 조합해 순수 클라이언트 휴리스틱으로 후보 배정을 계산(랭킹: 지난주 동일인 → 누적시간 → 정시출근율, 위험플래그: 15h 미만/40h 초과/6일 연속. 되는 시간 제출 API가 삭제돼 제출 여부·선호 시간대 랭킹은 없어졌다). 프로토타입의 휴가(leave) 차단 필터는 백엔드에 휴가 도메인이 없어 제외. "확정"은 기존 `createWorks`(배치 생성) 그대로 호출 |

### 직원 (직원 + 급여)

| 화면 | 상태 | 연동 API | 차이 |
|---|---|---|---|
| 직원 | ✅ | `GET .../owner/employees/stats`, `GET .../owner/invite-code` | |
| 직원 상세 | ✅ | `GET/PATCH .../owner/employees/{ticketId}`, `GET /tickets/{ticketId}/contract-documents`, `DELETE .../owner/employees/{ticketId}`, `GET .../owner/works/salary` | 서류는 목록(만료일)만 — 파일 등록/열람은 직원 본인만 가능(백엔드 권한 설계) · 직무는 매니저/직원/파트타임(`PART_TIME`), 기본 근무 요일(`availableDays`)을 요일 칩으로 편집한다. 예전 기본 가능 시작/종료 입력은 화면에서 뺐다(백엔드 필드는 남아 있음). 근무표 시간표는 날짜 아래에 그 요일이 기본 근무 요일인 직원을 띄우고, 근무 넣기에서도 그 직원을 앞에 올린다 |
| 급여 | ✅(공제만 추정) | `GET .../owner/works/salary` | 직원별 이번달 실제 수당(기본·야간·휴일)·주휴수당 합계를 그대로 보여줌(`totalPay + weeklyAllowanceAmount`로 합산 — 이미 정확히 반영돼 있음, 확인 완료). 공제(3.3%/4대보험)만 백엔드 도메인이 없어 `lib/utils/payroll.js`의 `deductionFor`로 브라우저 설정을 따름 |
| 사람 구하기(보조 링크) | 🧪 | 없음 | 직원 화면 안쪽 링크로 데모용 유지, 매출 도메인처럼 백엔드 지원 없음 |

### 매장 (할 일 + 공지·인수인계 + 레시피 + 매출)

| 화면 | 상태 | 연동 API | 차이 |
|---|---|---|---|
| 할 일 | ✅ | `GET .../tasks`, `GET .../tasks/{id}`, `POST/PATCH/DELETE .../owner/tasks`, `PATCH .../tasks/{taskId}/complete`(직원 완료) | TaskResponse가 Task로 병합돼(백엔드 PR #57) 담당자(`ticketId`)·마감(`dueDate`, 필수)·상태(`PENDING/COMPLETE/FAIL`)·응답이 task 하나에 다 있다. 만들 때 "누구에게 + 언제까지(날짜+시간)"를 정하고, 재배정 API는 없어 삭제 후 재생성. 승인/반려 없이 담당 직원이 스스로 완료 처리하며, 마감을 넘겨 제출하면 FAIL(‘기한 넘김’). PENDING만 삭제 가능. PHOTO 응답은 CDN 연결돼 점주가 `TaskDetailDrawer`에서 실제 사진을 봄 |
| 공지 · 인수인계 | ✅ | `GET .../notices`, `GET .../notices/{id}`, `POST/PATCH/DELETE .../owner/notices`, `GET/POST .../notices/{id}/comments`, `PATCH .../comments/{commentId}`; `GET .../hand-overs`, `POST/PATCH/DELETE .../hand-overs/{id}` | 목업에서 실제 API로 교체. pin·읽음 추적 필드는 백엔드에 없어 빠짐. 마감(CLOSE) 근무 1건당 인수인계 1개만 가능(백엔드 제약) |
| 레시피 | ✅ | `GET/POST/PATCH/DELETE .../manual-items` (category=RECIPE) | 메뉴 사진 업로드·표시 연결됨 — `uploadFile(file,'PROTECTED')`로 올리고 `thumbnailS3FileId`로 저장, `ProtectedThumb`로 CDN 통해 표시(`KNOWN_GAPS.md` #4). 버전(v)·"안 본 직원" 추적 없음 |
| 매출 | 🧪 | 없음 | 매출 도메인 없음 |

### 그 외 (메뉴 그룹 밖)

| 화면 | 상태 | 연동 API | 차이 |
|---|---|---|---|
| 퇴사 처리 | ✅ | `POST/GET .../owner/employees/{ticketId}/resignation`(시작/재개·조회), `PATCH .../resignation/type`(구분 확정), `PATCH .../resignation/evaluation`(평가 중간저장), `POST .../resignation/evaluation/send`(전송), `GET .../resignation`·`POST .../resignation/confirm`·`POST .../resignation/fix-request`(직원 본인) | 직원 상세의 "퇴사처리" 버튼 → `/owner/staff/{ticketId}/resignation` 전용 화면(정량 지표 스냅샷 → 퇴사 구분 → 7문항 평가 → 전송)에서 4단계를 그대로 따라간다. 직원 쪽은 `/staff/resignation`에서 확인/수정요청(오늘 화면에 배너로 진입). 직원 상세의 "내보내기"(즉시 비활성화, `DELETE .../owner/employees/{ticketId}`) 버튼은 제거해 퇴사 처리만 남겼다(API 함수 `removeEmployee`는 남겨 둠) |
| 알림 | ✅ | `GET .../alarms`, `GET .../alarms/{id}` | |
| 설정 · 매장 정보 | ✅ | `GET/PATCH .../owner/config` | |
| 설정 · 근무 시간대 | ✅ | `GET/PUT .../owner/time-templates` | |
| 설정 · 근무 운영 설정 | ✅ | `GET/PUT .../owner/time-config` | `minStaff`, `responseDeadlineMinutes`만(되는 시간 마감 요일은 삭제됨) |
| 설정 · 수당 계산 | ✅ | `GET/PATCH .../owner/config`(`applyWeeklyHolidayAllowance/NightAllowance/HolidayAllowance`) | 주휴·야간·휴일수당 적용 여부 토글. 급여 지급일·공제 방식은 여전히 🧪 목업 |
| 설정 · 알림 | 🧪 | 없음 | 알림 발송 자체(outbox/RabbitMQ)는 있지만, 항목별 on/off 설정 API는 없음 |
| 설정 · 팀/권한 | ⛔(만들지 않음) | 없음 | 매니저 세부 권한 개념이 백엔드에 없음 |
| 설정 · 요금제 | ⛔(만들지 않음) | 없음 | 베타 단계라 과금 개념 없음 |
| 설정 · 계정 | ✅ | `DELETE /members/me`(탈퇴), 로그아웃 | |

## 직원 화면 (`/staff/*`)

| 화면 | 상태 | 연동 API | 차이 |
|---|---|---|---|
| 오늘 | ✅ | `GET .../work-assignments/mine`, `POST .../works/{id}/check-in\|check-out`, `GET .../attendances/mine`(신규) | 체크인/체크아웃 직후 낙관적 갱신은 그대로 두되, 로드 시 `GET .../attendances/mine`(오늘 날짜)을 진실 소스로 조회해 새로고침해도 상태가 유지되도록 함(`KNOWN_GAPS.md` 옛 #2 해소). 로드 시 `GET .../resignation`도 함께 찔러보고(대개 404, 조용히 무시), 점주가 3단계까지 보낸 퇴사처리가 있으면 "확인하기" 배너로 `/staff/resignation`을 안내 |
| 근무표 | ✅ | `GET .../works?year=&month=` | 동료 이름은 안 보이고 내 근무 여부만 `assigned`로 제공 — API 제약 |
| 할 일 | ✅ | `GET .../tasks`(내게 배정된 것만 클라이언트에서 필터), `PATCH .../tasks/{taskId}/complete` | 승인/반려 없이 직원이 스스로 완료 처리. 마감 초과 제출은 FAIL |
| 내 급여 | ✅(공제만 추정) | `GET .../works/salary/mine` | 이번달 실제 수당·주휴수당 합계(`totalPay + weeklyAllowanceAmount`). 공제만 브라우저 설정 추정 |
| 공지 | ✅ | `GET .../notices`, `GET .../notices/{id}`, `POST .../notices/{id}/slots/{slotId}/apply`, 댓글 API | 근무 제안(`WORK_PROPOSAL`) 공지는 슬롯을 선착순으로 지원하면 그 자리에서 내 근무로 확정된다. 댓글은 1단계 @멘션 답글, 수정은 본인 것만(삭제 API 없음) |
| 레시피 | ✅ | `GET .../manual-items` | |
| 내 정보 | ✅ | `GET .../me`, `PATCH .../alias`, `GET/POST /tickets/{id}/contract-documents`, `GET .../attendances/mine`(신규) | "최근 근무" 목록에 이제 실제 체크인/아웃 시각·근무 상태를 표시(예전엔 예정 시각만 가능했음 — `KNOWN_GAPS.md` 옛 #2 해소) |
| 알림 | ✅ | | |
| 설정 | 🧪(부분) | 로그아웃/탈퇴만 실제 | |

## 공통 인프라

| 항목 | 상태 | 비고 |
|---|---|---|
| S3 업로드(presign) | ✅ | `lib/api/s3file.js` |
| PROTECTED 파일 열람(CDN) | ✅ | Cloudflare Worker(env `CDN_BASE_URL`)에 커스텀 헤더 `token`으로 요청해 blob object URL로 표시. `lib/api/s3file.js`의 `loadProtectedImages` (`KNOWN_GAPS.md` 옛 #4 해소) |
| StoreAccessFilter 통합 | (내부 리팩터링) | `StoreOwnerFilter`를 `StoreAccessFilter`로 통합하고 본인 데이터 조회를 storeId+memberId 대신 ticketId 기반으로 전환한 것은 백엔드 내부 구현 변경일 뿐, URL·요청 파라미터·응답 형태·권한 범위에는 영향 없음 — 프론트 코드 변경 불필요 |
