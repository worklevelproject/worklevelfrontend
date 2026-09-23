# 실제로 연결해보면서 발견한 API 공백

프론트를 백엔드에 실제로 붙이면서 (문서만 봐서는 안 드러나던) 구멍들이 몇 개 나왔다. 각각 지금
프론트가 어떻게 우회했는지와, 백엔드에 추가하면 좋을 API를 적어둔다.

## 1. (해결됨) 가입 직후 storeId를 몰라 수동 입력받던 문제

이전 작성분엔 `POST /stores/join` 응답(`TicketResponse`)에 `storeId`가 없어서 가입 직후 온보딩
화면에서 storeId를 직접 입력받는 임시 단계(`needsStoreId`)를 넣었다고 적혀 있었는데, 실제로는
`TicketResponse`에 `storeId`가 이미 있다(백엔드 커밋 `4aaeeb0`, `10d2d52`보다도 전) — 소스 대조
없이 옛 메모를 그대로 옮겨적은 게 원인으로 보인다. `onboarding/+page.svelte`의 수동 입력 단계를
지우고 `joinByInviteCode` 응답의 `ticket.storeId`로 바로 `session.selectStore`하도록 고쳤다.

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

## 2-1. (해결됨, 2026-09-15) 되는 시간 제출률을 "다음 주" 기준으로 볼 수 없던 문제

`GET /stores/{storeId}/owner/available-times/weekly`가 항상 "호출 시점 기준 이번 주(월~일)"만
반환해서, 직원들이 지금 한창 제출 중인 "다음 주" 되는 시간 현황을 점주가 미리 못 봤다. 백엔드에
`nextWeek`(boolean, 기본 false) 쿼리 파라미터가 추가돼 해결됨 —
`GET .../owner/available-times/weekly?nextWeek=true`면 다음주(월~일) 범위를 대신 조회한다.

프론트는 `lib/api/availableTime.js`의 `getOwnerWeeklyAvailability(storeId, nextWeek=false)`에
파라미터를 추가하고, 실제로 "다음 주" 데이터가 필요한 두 곳(`owner/today` 되는 시간 제출률 배너,
`ScheduleDraftDrawer`의 자동 근무표 초안)에서 `nextWeek: true`로 호출하도록 고쳤다.

> **(2026-09-20 갱신)** 위 `nextWeek` 파라미터로 해결했던 "되는 시간 제출률" 기능 자체가 백엔드에서
> 삭제됐다(`4be1f33` 직원 다음주 가능 시간대 기능 삭제). 프론트는 `availableTime.js`, `/staff/avail`,
> 점주 오늘 화면의 제출률 배너를 함께 제거했고, 자동 근무표 초안도 제출 여부·선호 시간대 랭킹 없이
> 지난주 동일인 → 누적시간 → 정시출근율만으로 배정한다.

## 2-2. (삭제됨, 2026-09-23) 자동 근무표 초안의 휴가 차단 로직

피드백으로 자동 근무표 초안 기능 자체를 뺐다(`ScheduleDraftDrawer`, `lib/utils/scheduleDraft.js` 삭제).

## 3. (해결됨, 2026-09-23) 직원 근무표에서 동료 이름을 못 보던 문제

백엔드 `GET /stores/{storeId}/works` 응답(`WorkResponse`)에 `workers`({ticketId, alias})가 추가돼,
`/staff/schedule`은 목록 한 번으로 동료 이름까지 보여준다.

## 4. (해결됨, 2026-09-15) PROTECTED 파일을 실제로 보여줄 CDN이 없던 문제

`POST /s3-files/protected-access`는 `{key, token}`만 주고 실제 조회 URL(CDN 호스트)은 클라이언트가
직접 구성해야 하는데, 그 CDN 레이어(Cloudflare Worker, R2 버킷 `worklvnonpublic` 앞단)가 이
저장소 밖에서 실제로 붙었다. Worker는 요청을 `token`이라는 **커스텀 헤더**(Authorization 아님)로
받아 HS256으로 서명 검증하고, `sub===key`(요청 경로의 파일 key와 토큰 주체가 일치하는지),
`approved===true`, 만료(`exp`)까지 확인한다 — 백엔드 `CdnTokenSigner`가 발급하는 토큰 형태와
정확히 대응된다(같은 서명 시크릿을 공유해야 함: 백엔드 `CDN_SIGN_SECRET` = Worker의 서명 키).

`lib/api/s3file.js`에 `CDN_BASE_URL`(env `CDN_BASE_URL`)과 `loadProtectedImages(s3FileIds)`를
추가했다 — `protected-access`로 파일별 `{key, token}`을 받은 뒤 `${CDN_BASE_URL}/${key}`를 커스텀
헤더 `token`으로 fetch해 blob object URL로 바꿔준다(`<img src>`에 커스텀 헤더를 직접 못 걸어서
fetch가 필요함 — 다 쓰면 `URL.revokeObjectURL`로 정리).

지금 실제로 연결한 곳:
- `TaskDetailDrawer`의 "할 일" PHOTO 응답(전에는 "사진 N장" 텍스트만 보여주고 실제 이미지는 안
  띄웠음 → 이제 썸네일로 표시).
- 레시피 썸네일 업로드/표시. `owner/recipes/[id]` 편집 화면에 사진 선택 input을 새로 추가해
  `uploadFile(file, 'PROTECTED')`(계약서 등록과 같은 presign 업로드 패턴)로 올린 뒤
  `thumbnailS3FileId`를 `createManualItem`/`updateManualItem` 요청에 실어 보낸다(파일을 새로 안
  고르면 필드를 생략해 기존 썸네일 유지 — `ManualItemService.updateManualItem`이 null을 "안 바꿈"
  으로 처리). 표시는 공용 `lib/components/ProtectedThumb.svelte`(id 없으면 `CupIcon` 색상 아이콘
  폴백)로 통일해 점주 레시피 목록/편집·직원 레시피 목록/상세 4곳 모두에 적용.

## 5. (오기 정정) 매장 정보 수정 API는 이미 있다

이전 작성분에 "매장 정보 수정 API가 없다"고 적혀 있었는데 확인해보니 사실이 아니다 —
`PATCH /stores/{storeId}/owner/config`(`UpdateStoreConfigRequest`: name/address/tel)가
`StoreController`에 이미 있고, `lib/api/store.js`의 `getStoreConfig`/`updateStoreConfig`로 프론트도
이미 연결돼 있다(`owner/settings` 화면의 "매장 정보" 탭이 그 API를 그대로 씀 — 읽기 전용이 아님).
소스 대조 없이 옛 메모를 그대로 옮겨적은 게 원인으로 보인다 — 실제 공백이 아니므로 항목 삭제.

## 6. 소셜 로그인(카카오/구글) 리다이렉트 쿠키가 로컬 http 환경에서 안 될 수 있다

`OAuth2LoginSuccessHandler`가 굽는 refreshToken 쿠키는 `secure(true)`라 브라우저가 https가 아니면
저장을 거부할 수 있다(브라우저마다 다름 — localhost는 종종 예외로 봐주기도 한다). 운영 배포(https)
에서는 문제가 안 되지만, 로컬 개발 중 로그인 직후 새로고침하면 다시 로그인해야 하는 증상이 있다면
이게 원인이다. 로컬 전용으로 이 쿠키의 secure 여부를 프로파일별로 바꾸는 건 보안 설정을 건드리는
일이라 이번 작업에서는 손대지 않았다 — 필요하면 별도로 논의해서 결정한다.

## 5. (해결됨, 2026-09-20) 직원 목록에서 테스트 멤버를 구분할 표식이 없다

점주가 `X-Acting-Ticket-Id`로 대리 접근할 수 있는 건 매장 생성 때 백엔드가 만든 테스트 멤버
(`Provider.TEST`)뿐인데 `GET /stores/{storeId}/employees`에 그 표식이 없어, 처음엔 alias가
`테스트직원`으로 시작하는지로 가려냈다(테스트 멤버가 alias를 바꾸면 사라지는 문제가 있었다).
백엔드가 `EmployeeSummaryResponse`에 `testMember: boolean`을 추가해(`757cf82`, `feat/accountUtility`)
해결됐고, 프론트(`lib/stores/testMembers.js`)는 이제 `testMember === true`인 직원만 후보로 쓴다.
이 필드가 master에 배포되기 전에는 후보 목록이 비어 보이니 백엔드 배포 순서에 유의. 예전에 만든
매장은 테스트 멤버 자체가 없을 수 있다(마이그레이션 여부는 백엔드 확인 필요).

## 7. (해결됨, 2026-09-22) 차후 적용될 시급을 조회할 방법이 없던 문제

`StoreService#applyHourlyWageRequest`는 이미 시급이 있는 ticket의 시급을 바꾸면 즉시 반영하지 않고
`HourlyWageChange` 스냅샷(다음주 월요일 `applyDate`)만 쌓아뒀다가 배치(`hourlyWageApplyStep`)가
승격시킨다(task.md 3 요구사항 - "현재 적용중인 임금, 차후에 적용될 임금"을 점주 화면에 보여줘야
함). `EmployeeDetailResponse`에 `pendingHourlyWage`/`pendingHourlyWageApplyDate`가 추가돼(PR #63,
`eec8e43`) 해결됐다 - 대기 중인 스냅샷이 없으면 둘 다 null. `getEmployeeDetail`/`getMyProfile`/
`updateEmployeeInfo` 세 경로 모두 적용됨.

프론트(`owner/staff/[ticketId]/+page.svelte`)는 임시로 뒀던 클라이언트 로컬 상태 목업을 걷어내고
`detail.pendingHourlyWage`/`detail.pendingHourlyWageApplyDate`를 그대로 쓰도록 고쳤다.

## 8. (신규, 2026-09-22) 직원 응답에 memberId가 없어 "다른 사람 passport 조회"를 실제로 못 붙인다

`GET /members/{memberId}/passports`(다른 회원의 공개 workPassport 조회, task.md 2)를 점주 화면에서
쓰려면 그 직원의 `memberId`가 필요한데, `EmployeeDetailResponse`/`EmployeeSummaryResponse`는 설계상
alias로만 식별되고 회원 실제 정보(memberId 포함)를 노출하지 않는다. 그래서
`owner/staff/[ticketId]` 화면의 "workPassport 보기" 버튼(`PassportViewDrawer.svelte`)은 지금
🧪 목업 데이터만 보여준다.

**제안**: `EmployeeDetailResponse`에 `memberId`를 추가하거나(다른 매장 개인정보 노출 우려가 있다면
점주 전용 응답에만), 점주용 `GET .../owner/employees/{ticketId}/passports`처럼 ticketId → 그
직원의 공개 workPassport를 대신 조회해주는 프록시 API를 새로 만드는 방법도 있다(멤버 식별자를
프론트에 아예 안 넘기고 싶다면 이쪽이 더 안전). 어느 쪽이든 되면 `PassportViewDrawer.svelte`의
목업 배열을 `getPublicPassports(memberId)`(또는 새 API) 호출로 바꾸면 된다.

## 6. (신규, 2026-09-20) 근무 제안 공지 목록에는 슬롯이 안 실린다

`GET .../notices`(목록)의 `NoticeResponse.slots`는 null이고 슬롯(지원 현황·내 지원 여부)은 단건
`GET .../notices/{id}`에만 있다. 그래서 공지를 펼칠 때(`NoticeBody`) 근무 제안이면 단건을 한 번 더
조회한다. 목록에서 "지원 가능한 근무 제안이 있어요" 같은 요약을 바로 보이려면 목록 응답에도 슬롯
요약이 필요하다.

## (해결됨, 2026-09-23) 알림 "더보기"를 offset으로 흉내 내던 문제

백엔드 알림 목록이 커서 방식(`cursor` = 마지막 alarmTargetId, `alarmTarget.id desc`, 10건)으로 바뀌었고, 읽음 처리
전용 API(`PATCH .../alarms/{id}/read`)가 생겼다. 프론트는 안 읽은 알림만 들고 있다가, 가장 작은 alarmTargetId를
cursor로 넘겨 이어 받는다. 응답에 총개수가 없어 배지는 불러온 개수(더 있으면 "N+")로 보여준다.
일괄 "모두 읽음" API는 아직 없다.
