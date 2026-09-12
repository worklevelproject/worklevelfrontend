# 화면 ↔ 백엔드 API 매핑

작성 기준일: 2026-09-11 (2026-09-12 worklevelbackend master 갱신분 두 차례 반영 및 프론트 재연동
완료). worklevel-src 프로토타입 화면을 기준으로, 이번 포팅에서 각 화면이 실제 백엔드 API로
동작하는지(✅), 브라우저에만 저장되는 목업인지(🧪), 아예 만들지 않았는지(⛔)를 정리한다. API가
있어도 화면이 원래 요구하던 것과 조금 다르게 단순화된 부분은 "차이" 칸에 적었다.

**09-12 백엔드 변경 요약**: Task/TaskResponse 도메인 신설(work-response 도메인은 삭제됨),
Notice·HandOver 도메인 신설, 매장 기본 정보(이름/주소/전화) 편집 API 신설, 수당(Cost)·주휴수당·
5인이상 판정 계산 로직 신설에 이어 그 조회 API(`.../works/salary/mine`, `.../owner/works/salary`)도
같은 날 추가됨. **프론트도 전부 재연동 완료** — 할 일 화면을 새 Task/TaskResponse API로 다시 짰고
(승인/반려 단계는 백엔드에서 없어졌음), 공지·인수인계·매장 정보 편집을 목업/읽기전용에서 실제 API
연동으로 바꿨고, 급여도 목업 계산식(`payFor`)을 걷어내고 백엔드 실제 수당·주휴수당 값을 쓰도록
바꿨다(공제 3.3%/4대보험만 백엔드에 도메인이 없어 여전히 브라우저 설정 추정).

## 인증 · 매장 연결

| 화면 | 상태 | 연동 API | 차이 |
|---|---|---|---|
| 로그인 | ✅ | `GET /oauth2/authorization/kakao` → 카카오 → `/login/oauth2/code/kakao` | 프로토타입의 "휴대전화 인증번호" 로그인은 실제 백엔드에 없어서 카카오 로그인으로 교체 |
| 매장 만들기/참여 | ✅ | `POST /stores`, `POST /stores/join` | 새 화면(프로토타입엔 없던 온보딩) — 초대코드로 가입한 직후 storeId를 알려주는 API가 없어서, 가입 후 storeId를 직접 입력받는 임시 단계가 끼어 있음(`KNOWN_GAPS.md` 참고) |

## 점주 화면 (`/owner/*`)

| 화면 | 상태 | 연동 API | 차이 |
|---|---|---|---|
| 오늘 | ✅ | `GET .../owner/dashboard/attendance`, `GET .../owner/work-requests/attendance-corrections`, `GET .../owner/work-requests?status=REJECT`, `GET .../owner/employees/stats`, `GET .../notices`, `GET .../hand-overs`, `GET .../owner/works/salary` | 매출 카드만 🧪 목업(`lib/stores/mock.js`, 매출 도메인 없음). 공지·마감 노트·이번 달 급여 예상 카드는 실제 API로 교체(공제만 추정) |
| 근무표 | ✅ | `GET .../owner/works/weekly`, `POST .../owner/works`, `PATCH/DELETE .../owner/works/{id}` | 프로토타입의 매트릭스뷰·월간캘린더뷰는 생략(주간 보드뷰만). "되는 시간 순 추천"은 생략 — 참여자 추가는 전 직원 목록에서 고름 |
| 출퇴근 | ✅ | `GET .../owner/dashboard/attendance`, 정정 승인/거절 API | 점주가 대신 출근/퇴근 처리하던 기능은 삭제 — 실제 출퇴근은 본인만 가능(백엔드 제약) |
| 할 일 | ✅(재설계됨) | `GET .../tasks`, `GET .../tasks/{id}`, `POST/PATCH/DELETE .../owner/tasks`, `POST .../owner/tasks/{taskId}/responses`(배정), `PATCH .../tasks/{taskId}/responses/{id}/complete`(직원 완료) | work-response(근무별 보고 + 점주 승인/반려)가 사라지고, 근무와 무관한 별도 할 일(Task) 정의 + 담당자 배정(1건씩, 재배정 가능) 방식으로 완전히 바뀜. 승인/반려 단계 없이 담당 직원이 스스로 완료 처리(`taskResponsePillClass`). 옛 `lib/api/workResponse.js`는 삭제, 화면은 `owner/tasks` + `TaskDetailDrawer`(배정/수정/삭제) + `TaskFormDrawer`(생성)로 재작성 |
| 공지 | ✅ | `GET .../notices`, `GET .../notices/{id}`, `POST/PATCH/DELETE .../owner/notices` | 목업(pin 고정, 읽음 인원 수)에서 실제 API로 교체. pin·읽음 추적 필드는 백엔드에 없어서 그 기능은 빠짐 |
| 인수인계 | ✅ | `GET .../hand-overs`, `POST/PATCH/DELETE .../hand-overs/{id}` | 목업에서 실제 API로 교체. 마감(CLOSE) 근무 1건당 1개만 작성 가능(백엔드 제약) — 직원 쪽은 `staff/today`에서 오늘 근무가 CLOSE일 때만 "마감 인수인계 쓰기" 버튼 노출. 사진 첨부는 백엔드 필드가 없어 텍스트만 |
| 직원 | ✅ | `GET .../owner/employees/stats`, `GET .../owner/invite-code` | |
| 직원 상세 | ✅ | `GET/PATCH .../owner/employees/{ticketId}`, `GET /tickets/{ticketId}/contract-documents`, `DELETE .../owner/employees/{ticketId}`, `GET .../owner/works/salary`(목록에서 해당 ticketId 행) | 서류는 목록(만료일)만 — 파일 등록/열람은 직원 본인만 가능(백엔드 권한 설계). "이번달 급여" 카드도 실제 API로 교체 |
| 급여 | ✅(공제만 추정) | `GET .../owner/works/salary` | 직원별 이번달 실제 수당(기본·야간·휴일)·주휴수당 합계를 그대로 보여줌. 공제(3.3%/4대보험)만 백엔드 도메인이 없어 `lib/utils/payroll.js`의 `deductionFor`로 브라우저 설정을 따름 |
| 레시피 | ✅ | `GET/POST/PATCH/DELETE .../manual-items` (category=RECIPE) | 메뉴 사진 업로드는 미연결(아래 CDN 관련 `KNOWN_GAPS.md` 참고) — 색 아이콘으로 대체. 버전(v)·"안 본 직원" 추적 없음(백엔드에 그 필드가 없음) |
| 매출 | 🧪 | 없음 | 매출 도메인 없음 |
| 사람 구하기 | 🧪 | 없음 | 기획 단계에서도 "시기상조로 미구현"이라 기록된 기능 |
| 퇴사 처리 | ⛔ (만들지 않음) | `DELETE .../owner/employees/{ticketId}`만 있음 | 프로토타입의 3단계 평가·직원확인 플로우에 대응하는 API가 없어 화면 자체를 만들지 않았고, 대신 직원 상세의 "내보내기" 버튼(티켓 비활성화)만 제공 |
| 알림 | ✅ | `GET .../alarms`, `GET .../alarms/{id}` | |
| 설정 · 매장 정보 | ✅ | `GET/PATCH .../owner/config` | 읽기전용이었다가 이름/주소/전화 편집 폼 추가. 저장 후 `session.selectStore`로 사이드바 매장명도 갱신 |
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
| 할 일 (신규) | ✅ | `GET .../tasks`(내게 배정된 것만 클라이언트에서 필터), `PATCH .../tasks/{taskId}/responses/{id}/complete` | 사이드바에 새로 추가한 화면. 승인/반려 없이 직원이 스스로 완료 처리 |
| 내 급여 | ✅(공제만 추정) | `GET .../works/salary/mine` | 이번달 실제 수당·주휴수당 합계를 그대로 보여줌. 공제만 브라우저 설정 추정(위 급여 행 참고) |
| 공지 | ✅ | `GET .../notices`, `GET .../notices/{id}` | 목업에서 실제 API로 교체 |
| 레시피 | ✅ | `GET .../manual-items` | |
| 내 정보 | ✅(부분) | `GET .../me`, `PATCH .../alias`, `GET/POST /tickets/{id}/contract-documents` | 내 출퇴근 이력 조회 API가 없어 "최근 근무" 목록에 실제 출퇴근 시각은 못 보여줌 |
| 알림 | ✅ | | |
| 설정 | 🧪(부분) | 로그아웃/탈퇴만 실제 | |

## 공통 인프라

| 항목 | 상태 | 비고 |
|---|---|---|
| S3 업로드(presign) | ✅ | `lib/api/s3file.js` |
| PROTECTED 파일 열람(CDN) | ⛔ | Cloudflare 등 CDN 호스트가 이 저장소 설정 어디에도 없어서, 업로드는 되지만 그 파일을 실제로 보여주는 `<img>` 연결은 하지 않음 |
