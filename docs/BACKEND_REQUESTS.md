# 백엔드 작업 요청과 반영 현황

2026-09-25에 `task.md`의 피드백 충돌 결정(`FEEDBACK_CONFLICTS.md` 1~5)을 반영하면서 백엔드에 요청한 항목이다.
백엔드 #67(`feat/feedBack-3`)로 대부분 반영됐고, 프론트도 그에 맞춰 목업·클라이언트 계산을 걷어냈다.

| # | 항목 | 상태 | 백엔드 API | 프론트 반영 |
|---|---|---|---|---|
| 1-1 | 반복 근무 규칙 | ✅ 반영 | `POST/GET/PATCH/DELETE .../owner/work-series`, 근무 응답의 `seriesId` | 근무 넣기 "매주 반복"(종료일 선택) → 반복 규칙 생성. 근무 상세에서 "반복 근무 전체"로 수정·끝내기 |
| 1-2 | 근무 시각 변경 | ✅ 반영 | `PATCH .../owner/works/{id}`의 `startTime/endTime`(변경 알림) | 근무 상세 "시간 바꾸기". 새로 만들고 지우던 우회 방식은 삭제 |
| 1-3 | 퇴사 시 남은 근무 정리 | ✅ 반영 | 직원 제외·퇴사 확정 때 시작 전 배정과 반복 근무 참여를 같은 트랜잭션에서 정리 | 직원 상세의 "남은 근무 모두 빼기" 삭제 |
| 2 | 매장 운영 시간대(평일/주말) | ✅ 반영 | `GET/PATCH .../owner/config`의 `weekday/weekend Open/CloseTime` | 설정 > 매장 정보 > 운영 시간대. 목업 저장 삭제 |
| 3 | 개인정보 동의·입력 | ✅ 반영 | `POST .../me/privacy-consent`, `GET/PUT .../me/personal-info`, `GET .../me`의 `privacyConsented`, 직원 상세의 `personalInfo` | `/staff/welcome` 서버 연동, 동의 가드는 `session.privacyConsented`, 점주 직원 상세에 개인정보 카드 |
| 4 | 급여 지급일 알림 | — 결정대로 문구만 | 없음 | 설정 문구만. 지급일 값은 목업 |
| 5 | 직원별 공제 방식 | ✅ 반영 | 직원 수정의 `deductionType`, 급여 응답의 `deductionType/deductionAmount/netPay` | 직원 상세에서 바로 저장, 급여 화면들이 서버 계산값을 표시. `lib/utils/payroll.js` 삭제 |
| - | 안 읽은 알림 개수 | ✅ 반영 | `GET .../alarms/unread-count` | 배지 |
| - | 알림 모두 읽음 | ✅ 반영 | `PATCH .../alarms/read-all` | 알림 화면 "모두 읽음" |

## 참고: timeType과 closing

근무·반복 근무·근무 제안 칸 요청의 `timeType`은 필수다. 서버는 이 값을 저장하지 않고, CLOSE인지만 봐서
`closing`(마감 근무 = 인수인계 대상)으로 저장한다. 응답에는 `timeType` 대신 `closing`만 온다.

프론트는 시간대를 사용자에게 고르게 하지 않는다. 매장 운영 시간대와 근무 시각을 비교해 `timeType`을 정한다
(`lib/utils/storeHours.js`의 `timeTypeFor`: 닫는 시각까지 = CLOSE, 여는 시각부터 = OPEN, 12시 이후 = AFTERNOON, 그 밖 = NORMAL).
근무 칸 표시는 `closing`이면 "마감", 아니면 시작 시각으로 "오전/오후"를 나눈다(`shiftLabel`).

## 아직 남은 것

| 항목 | 필요한 것 |
|---|---|
| 급여 지급일 | 결정 4에 따라 요청하지 않음. 실제 알림이 필요해지면 매장 지급일 필드와 3일 전·1일 전·당일 알림 스케줄러 |
| 매출 | 매출 도메인 자체(지금은 브라우저 목업) |
| 운영 시간대 기반 timeType | (선택) 요청에서 timeType을 생략하면 서버가 운영 시간대로 정해 주면 프론트 계산(`timeTypeFor`)을 없앨 수 있다. 한때 들어갔다가 필수 파라미터로 되돌려짐 |
| 동의 문구 | 초안(`src/routes/staff/welcome/+page.svelte`)을 법무 검토 후 확정하고, 바꾸면 `PRIVACY_CONSENT_VERSION`도 올린다 |
