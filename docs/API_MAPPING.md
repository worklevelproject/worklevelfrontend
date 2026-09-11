# 화면 ↔ 백엔드 API 매핑

작성 기준일: 2026-09-11. worklevel-src 프로토타입 화면을 기준으로, 이번 포팅에서 각 화면이 실제
백엔드 API로 동작하는지(✅), 브라우저에만 저장되는 목업인지(🧪), 아예 만들지 않았는지(⛔)를 정리한다.
API가 있어도 화면이 원래 요구하던 것과 조금 다르게 단순화된 부분은 "차이" 칸에 적었다.

## 인증 · 매장 연결

| 화면 | 상태 | 연동 API | 차이 |
|---|---|---|---|
| 로그인 | ✅ | `GET /oauth2/authorization/kakao` → 카카오 → `/login/oauth2/code/kakao` | 프로토타입의 "휴대전화 인증번호" 로그인은 실제 백엔드에 없어서 카카오 로그인으로 교체 |
| 매장 만들기/참여 | ✅ | `POST /stores`, `POST /stores/join` | 새 화면(프로토타입엔 없던 온보딩) — 초대코드로 가입한 직후 storeId를 알려주는 API가 없어서, 가입 후 storeId를 직접 입력받는 임시 단계가 끼어 있음(`KNOWN_GAPS.md` 참고) |

## 점주 화면 (`/owner/*`)

| 화면 | 상태 | 연동 API | 차이 |
|---|---|---|---|
| 오늘 | ✅ | `GET .../owner/dashboard/attendance`, `GET .../owner/work-requests/attendance-corrections`, `GET .../owner/work-requests?status=REJECT`, `GET .../owner/employees/stats` | 매출·공지 카드는 🧪 목업(`lib/stores/mock.js`). 급여 예상은 실제 근무시간 + 목업 계산식 |
| 근무표 | ✅ | `GET .../owner/works/weekly`, `POST .../owner/works`, `PATCH/DELETE .../owner/works/{id}` | 프로토타입의 매트릭스뷰·월간캘린더뷰는 생략(주간 보드뷰만). "되는 시간 순 추천"은 생략 — 참여자 추가는 전 직원 목록에서 고름 |
| 출퇴근 | ✅ | `GET .../owner/dashboard/attendance`, 정정 승인/거절 API | 점주가 대신 출근/퇴근 처리하던 기능은 삭제 — 실제 출퇴근은 본인만 가능(백엔드 제약) |
| 할 일 | ✅ | `GET .../work-responses`, `PATCH .../owner/works/{id}/response` | "배정만 되고 아직 보고 안 된 근무"는 이 목록에 안 뜸(work_response가 생성 전이라) — 근무표에서 확인하도록 안내 문구만 추가 |
| 공지 · 인수인계 | 🧪 | 없음 | 백엔드에 Notice/Handover 도메인 자체가 없음 |
| 직원 | ✅ | `GET .../owner/employees/stats`, `GET .../owner/invite-code` | |
| 직원 상세 | ✅ | `GET/PATCH .../owner/employees/{ticketId}`, `GET /tickets/{ticketId}/contract-documents`, `DELETE .../owner/employees/{ticketId}` | 서류는 목록(만료일)만 — 파일 등록/열람은 직원 본인만 가능(백엔드 권한 설계) |
| 급여 | 🧪(부분) | `GET .../owner/employees/stats`의 실제 근무시간 사용 | 급여 계산 규칙(주휴/야간/연장/공제)과 급여 도메인 자체는 없어서 프론트 계산식(`lib/utils/payroll.js`) |
| 레시피 | ✅ | `GET/POST/PATCH/DELETE .../manual-items` (category=RECIPE) | 메뉴 사진 업로드는 미연결(아래 CDN 관련 `KNOWN_GAPS.md` 참고) — 색 아이콘으로 대체. 버전(v)·"안 본 직원" 추적 없음(백엔드에 그 필드가 없음) |
| 매출 | 🧪 | 없음 | 매출 도메인 없음 |
| 사람 구하기 | 🧪 | 없음 | 기획 단계에서도 "시기상조로 미구현"이라 기록된 기능 |
| 퇴사 처리 | ⛔ (만들지 않음) | `DELETE .../owner/employees/{ticketId}`만 있음 | 프로토타입의 3단계 평가·직원확인 플로우에 대응하는 API가 없어 화면 자체를 만들지 않았고, 대신 직원 상세의 "내보내기" 버튼(티켓 비활성화)만 제공 |
| 알림 | ✅ | `GET .../alarms`, `GET .../alarms/{id}` | |
| 설정 · 매장 정보 | ⛔(읽기전용) | `GET /stores/{id}` | 매장 이름/주소/전화 수정 API가 없음 |
| 설정 · 근무 시간대 | ✅ | `GET/PUT .../owner/time-templates` | |
| 설정 · 근무 운영 설정 | ✅ | `GET/PUT .../owner/time-config` | |
| 설정 · 급여 규칙 | 🧪 | 없음 | |
| 설정 · 알림 | 🧪 | 없음 | 알림 발송 자체(outbox/RabbitMQ)는 백엔드에 있지만, 항목별 on/off 설정 API는 없음 |
| 설정 · 팀/권한 | ⛔(만들지 않음) | 없음 | 매니저에게 화면별 권한을 나눠주는 개념 자체가 백엔드에 없음(jobRole=MANAGER만 있고 세부 권한 없음) |
| 설정 · 요금제 | ⛔(만들지 않음) | 없음 | 베타 단계라 과금 개념 없음 |
| 설정 · 계정 | ✅ | `DELETE /members/me`(탈퇴), 로그아웃 | |

## 직원 화면 (`/staff/*`)

| 화면 | 상태 | 연동 API | 차이 |
|---|---|---|---|
| 오늘 | ✅ | `GET .../work-requests/mine`, `POST .../work-requests/{id}/accept|reject`, `POST .../works/{id}/check-in|check-out` | 체크인/체크아웃 상태를 다시 조회하는 API가 없어서, 그 세션 안에서 직접 누른 결과만 화면에 반영됨(새로고침하면 다시 "출근 전"으로 보임 — `KNOWN_GAPS.md`) |
| 근무표 | ✅ | `GET .../works?year=&month=` | 동료 이름/배정 여부는 안 보임(myStatus만 제공) — API 제약 |
| 다음 주 되는 시간 | ✅ | `GET .../available-times/me`, `PUT .../available-times` | 프로토타입의 "좋아요/돼요/안돼요" 3단계 선호도는 없고 가능/불가능 2단계만(백엔드가 timeType 존재 여부만 저장) |
| 내 급여 | 🧪(부분) | 내 accept된 work-request로 주간시간 직접 합산 | 계산식은 급여와 동일하게 목업 |
| 공지 | 🧪 | 없음 | |
| 레시피 | ✅ | `GET .../manual-items` | |
| 내 정보 | ✅(부분) | `GET .../me`, `PATCH .../alias`, `GET/POST /tickets/{id}/contract-documents` | 내 출퇴근 이력 조회 API가 없어 "최근 근무" 목록에 실제 출퇴근 시각은 못 보여줌 |
| 알림 | ✅ | | |
| 설정 | 🧪(부분) | 로그아웃/탈퇴만 실제 | |

## 공통 인프라

| 항목 | 상태 | 비고 |
|---|---|---|
| S3 업로드(presign) | ✅ | `lib/api/s3file.js` |
| PROTECTED 파일 열람(CDN) | ⛔ | Cloudflare 등 CDN 호스트가 이 저장소 설정 어디에도 없어서, 업로드는 되지만 그 파일을 실제로 보여주는 `<img>` 연결은 하지 않음 |
