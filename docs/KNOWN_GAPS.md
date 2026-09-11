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

## 2. 직원 본인의 출퇴근 상태/이력을 조회할 방법이 없다

- 대시보드 API(`GET .../owner/dashboard/attendance`)는 점주 전용(`/owner/` 경로, `StoreOwnerFilter`)이라 직원 본인은 호출할 수 없다.
- `checkIn`/`checkOut`/`accept`/정정 제안 API는 그 순간의 `WorkRequestCheckResponse`(checkIn/checkOut 여부·시각)를 응답으로 주지만, 이후 새로고침하면 그 값을 다시 읽어올 API가 없다.

그래서 `/staff/today` 화면은 그 세션에서 직접 버튼을 눌러 받은 응답만 상태로 들고 있고,
새로고침하면 다시 "출근 전"으로 보인다. `/staff/me`의 "최근 근무"도 날짜·시간만 보여주고 실제
체크인/아웃 시각은 못 보여준다.

**제안**: `GET /stores/{storeId}/work-requests/mine`에 checkIn/checkOut 여부·시각 필드를 추가하거나
(가장 간단), `GET /stores/{storeId}/me/attendance` 같은 본인 전용 조회 API를 추가한다.

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
