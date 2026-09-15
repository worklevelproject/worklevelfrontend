# WORKLEVEL 프론트엔드 (SvelteKit)

루트의 `worlvprototypenewvesionsrc/` 정적 프로토타입(v8)을 SvelteKit(Svelte 5) 기반으로 옮기고, 실제
백엔드 API에 연결한 결과물이다. v8은 점주 메뉴를 오늘/근무/직원/매장 4개로 재편하고, 오늘 화면에 다음
주 근무표 상태·되는 시간 제출률 카드를, 근무 화면에 자동 근무표 초안 기능을 새로 추가했다. 백엔드
연동 현황과 남은 과제는 `docs/API_MAPPING.md`와 `docs/KNOWN_GAPS.md`를 본다.

## 실행하기

```bash
npm install
cp .env.example .env   # 값은 아래 "백엔드와 맞추기" 참고
npm run dev
```

브라우저에서 `http://localhost:5173` 로 접속한다. 완전한 클라이언트 렌더 SPA라 SSR/프리렌더는 꺼져
있고(`src/routes/+layout.js`), `npm run build`는 정적 파일(`build/`)을 만들어낸다 — 어떤 정적
호스팅이든 그대로 올리면 된다.

## 백엔드와 맞추기

이 프론트는 백엔드(`../src`, Spring Boot)가 별도 오리진에서 REST API로 떠 있다고 가정한다. 최소
아래 세 가지가 맞아야 로그인부터 끝까지 돌아간다.

1. **백엔드 실행 + CORS**: 백엔드 `SecurityConfig`에 `cors.allowed-origins` 프로퍼티(기본값
   `http://localhost:5173`)를 이 프론트 주소와 맞춘다. 이번 작업으로 백엔드에 CORS 설정 자체를
   새로 추가했다(원래 없었음) — `application-dev.yaml`의 `cors.allowed-origins` 또는
   `CORS_ALLOWED_ORIGINS` 환경변수로 조정한다.
2. **소셜 로그인 리다이렉트**: 백엔드 환경변수 `OAUTH2_REDIRECT_URI`(카카오/구글 공통, 로그인 성공 후
   최종적으로 돌아올 프론트 주소)를 이 프론트의 `.env`에 적은 `OAUTH2_CALLBACK_URL`(기본
   `http://localhost:5173/auth/callback`)과 똑같이 맞춘다. 카카오 개발자 콘솔/구글 클라우드 콘솔의
   Redirect URI는 각각 백엔드 콜백 주소(`/login/oauth2/code/kakao`, `/login/oauth2/code/google`)로
   등록돼 있어야 한다(백엔드 환경변수는 `KAKAO_REDIRECT_URI`/`GOOGLE_REDIRECT_URI` 및
   `*_CLIENT_ID`/`*_CLIENT_SECRET`).
3. **refreshToken 쿠키**: 백엔드가 `secure(true)`인 쿠키를 내려주므로(`OAuth2LoginSuccessHandler`),
   로컬에서 http로만 띄우면 브라우저가 쿠키를 저장하지 않아 새로고침 시 로그인이 풀릴 수 있다.
   운영 배포(https)에서는 문제 없다 — 로컬 개발 중 이 문제를 겪으면 `docs/KNOWN_GAPS.md`의 관련
   항목을 참고한다.

## 폴더 구조

```
src/
  app.css                  프로토타입 web4-head.html의 CSS를 그대로 옮긴 전역 스타일
  lib/
    api/                   도메인별 fetch 래퍼 (client.js가 토큰 갱신·에러 처리 공통 담당)
    stores/                전역 상태 (session, toast, drawer, confirm, notifications, mock)
    components/            공용 UI (Shell/Sidebar/Topbar, DrawerHost, Icon, HexChart ...)
    components/drawers/    프로토타입의 openSheet() 각각에 대응하는 드로어 컴포넌트
    mock/                  백엔드에 아직 없는 도메인의 초기 목업 데이터(seed.js)
    utils/                 날짜/포맷/급여계산/라벨 매핑 등 순수 함수
  routes/
    login, onboarding, auth/callback   인증·매장 연결 흐름
    owner/**                           점주 화면 (jobRole === 'OWNER')
    staff/**                           직원 화면 (그 외)
```

## 역할 판단

프로토타입은 화면 우측 상단에서 "사장님/직원"을 그냥 토글할 수 있었지만, 여기서는 실제 권한을
따른다 — `GET /stores/{storeId}/me`가 내려주는 `jobRole`이 `OWNER`면 `/owner/*`, 아니면(`MANAGER`도
포함) `/staff/*`로 보낸다. 매니저 전용 권한 세분화 화면은 목업으로만 남아있다(`docs/KNOWN_GAPS.md`).
