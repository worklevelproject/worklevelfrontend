# 실제로 연결해보면서 발견한 API 공백

프론트를 백엔드에 실제로 붙이면서 (문서만 봐서는 안 드러나던) 구멍들이 몇 개 나왔다. 각각 지금
프론트가 어떻게 우회했는지와, 백엔드에 추가하면 좋을 API를 적어둔다.

## 1. 가입 직후 storeId를 모른다

`POST /stores/join`(초대코드 가입) 응답인 `TicketResponse`에는 `ticketId/jobRole/alias`만 있고
`storeId`가 없다. 그래서 가입 직후 바로 그 매장으로 들어갈 수가 없어서, 온보딩 화면에서 storeId를
직접 입력받는 임시 단계를 넣었다(`src/routes/onboarding/+page.svelte`의 `needsStoreId`).

**제안**: `TicketResponse`에 `storeId`를 추가하거나, `GET /members/me/stores` 같은 "내가 속한 매장
목록" 조회 API를 하나 추가하면 이 우회가 통째로 없어진다. 로그인 직후 매장 선택 화면을 만들 때도
필요하다(지금은 마지막으로 골랐던 storeId를 `localStorage`에 저장해두는 걸로 때움).

## 2. (해결됨, 2026-09-13) 직원 본인의 출퇴근 상태/이력을 조회할 방법이 없다

백엔드에 `GET /stores/{storeId}/attendances/mine?fromDate=&toDate=&offset=`(직원 본인 출퇴근 이력
조회, 아무 활성 티켓이나 호출 가능)가 새로 생기며 해결됐다. `AttendanceItemResponse`가
`workRequestId, ticketId, alias, workDate, workStartTime, workEndTime, checkInTime, checkIn,
checkOutTime, checkOut, workMinutes, status`를 준다.

- `/staff/today`: 버튼을 눌러 받은 응답으로 낙관적 갱신하는 건 그대로 두되, 화면 로드 시 오늘
  날짜로 이 API를 호출해 진실 소스로 삼는다 — 새로고침해도 더 이상 "출근 전"으로 리셋되지 않는다.
- `/staff/me`: "최근 근무" 목록을 이 API 기반으로 바꿔 실제 체크인/아웃 시각·근무시간을 보여준다.

(옛 제안이었던 "work-requests/mine에 필드 추가" 대신 별도 엔드포인트로 해결됨 — 목록형이라
`lib/utils/pagedList.js` 페이징 패턴을 그대로 적용.)

## 2-1. (신규) 되는 시간 제출률을 "다음 주" 기준으로 볼 수 없다

`GET /stores/{storeId}/owner/available-times/weekly`는 항상 "호출 시점 기준 이번 주(월~일)"만
반환한다(`AvailableTimeService.getOwnerWeeklyAvailability`가 `weekStart`를
`LocalDate.now().with(previousOrSame(MONDAY))`로 고정). 직원은 항상 "다음 주" 가능 시간을
제출하므로, 지금 진행 중인(아직 시작 안 한) 다음 주의 제출 현황을 점주가 미리 확인하려는 용도로는
이 API가 정확한 주를 못 준다 — 오늘 화면의 "되는 시간 제출률" 배너는 일단 이 API가 주는 "이번
주"(=직전에 마감된 제출 주기) 데이터로만 구현했고, 기획상 진짜 필요한 게 "다음 주 실시간 제출
현황"이라면 백엔드에 조회 대상 주(`weekStart`) 파라미터를 추가하는 게 필요하다. 버그가 아니라
확인이 필요한 지점 — 기획/백엔드와 상의해서 결정하면 좋겠다.

## 2-2. (신규) 자동 근무표 초안에 휴가/휴무 차단 로직이 빠져 있다

v8 프로토타입의 `genDraft()`는 배정 후보를 고를 때 그 직원이 그날 휴가/휴무 중인지도 걸러내는데,
백엔드에 휴가(leave) 도메인 자체가 없다. 그래서 포팅한 자동 근무표 초안(`lib/utils/scheduleDraft.js`)은
이 필터를 조용히 빼고, 가능 시간대·이번주 확정 근무·40시간/6일연속 조건만으로 후보를 추린다.
휴가 개념을 백엔드에 추가하기 전까지는, 초안이 이미 쉬기로 한 직원을 후보로 올릴 수 있다는 점을
운영자가 감안해야 한다.

## 3. 직원 화면에서 동료 근무표를 볼 수 없다

`GET /stores/{storeId}/works`(전직원 접근 가능)는 매장의 모든 근무를 "본인 myStatus"만 붙여 주지,
그 근무에 배정된 다른 직원이 누군지는 안 준다(`workers` 필드가 없음 — 그건 `WorkDetailResponse`에만
있고, 그마저도 점주만 `workRequests` 전체를 본다). `/staff/schedule`은 그래서 시간/제목만 보이고
"OO님 근무"처럼 동료 이름은 못 띄운다.

**제안**: 의도적인 제약(동료 개인정보 보호)일 수도 있어서, 이건 "버그"보다는 확인이 필요한 지점 —
직원끼리 서로의 근무 시간을 보는 게 기획상 맞는지부터 정하면 좋겠다.

## 4. PROTECTED 파일을 실제로 보여줄 CDN이 없다

`POST /s3-files/protected-access`는 `{key, token}`만 주고 실제 조회 URL(CDN 호스트)은 클라이언트가
직접 구성하라고 되어 있는데, 그 호스트 주소가 `application*.yaml` 어디에도 없다(`cdn-sign-secret`
서명 시크릿만 있음). Cloudflare Worker 같은 실제 CDN 레이어가 이 저장소 밖에 있거나, 아직
안 만들어졌거나 둘 중 하나로 보인다.

그래서 레시피 썸네일·근무 보고 사진 **업로드는 되지만**(presign PUT은 CDN과 무관하게 S3/R2로 바로
가므로), 업로드된 사진을 다시 보여주는 `<img>`는 붙이지 않았다.

**제안**: CDN 베이스 URL을 설정값(`app.s3.cdn-base-url` 같은)으로 추가하고, 프론트 `.env`의
`VITE_CDN_BASE_URL`과 맞추면 바로 연결할 수 있다. `lib/api/s3file.js`의 `createProtectedAccess`는
이미 구현돼 있다.

## 5. 매장 정보 수정 API가 없다

`StoreController`에 매장 생성/조회/삭제는 있지만 이름·주소·전화 수정(`PATCH`)이 없다. 설정 화면의
"매장 정보" 탭은 그래서 읽기 전용이다.

## 6. 카카오 OAuth 리다이렉트 쿠키가 로컬 http 환경에서 안 될 수 있다

`OAuth2LoginSuccessHandler`가 굽는 refreshToken 쿠키는 `secure(true)`라 브라우저가 https가 아니면
저장을 거부할 수 있다(브라우저마다 다름 — localhost는 종종 예외로 봐주기도 한다). 운영 배포(https)
에서는 문제가 안 되지만, 로컬 개발 중 로그인 직후 새로고침하면 다시 로그인해야 하는 증상이 있다면
이게 원인이다. 로컬 전용으로 이 쿠키의 secure 여부를 프로파일별로 바꾸는 건 보안 설정을 건드리는
일이라 이번 작업에서는 손대지 않았다 — 필요하면 별도로 논의해서 결정한다.
