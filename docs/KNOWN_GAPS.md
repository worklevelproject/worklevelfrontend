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
