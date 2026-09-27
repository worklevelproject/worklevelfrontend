# 백엔드 요청과 반영 현황 (최종, 2026-09-27)

피드백(`FEEDBACK_CONFLICTS.md`)을 반영하면서 프론트만으로는 할 수 없어 백엔드에 요청한 항목과 그 결과다.
기준은 백엔드 `origin/master`(#68까지)이고, 프론트는 PR #12 브랜치다.

## 1. 반영 완료

| 항목 | 백엔드 | 백엔드 API | 프론트 반영 |
|---|---|---|---|
| 공지 읽음 기록·읽은 사람 | #65·#66 | 공지 목록 `read.readCheck/readCount`, 상세 조회 시 읽음 기록·`read.readers` | 공지 행 "읽음 N명", 펼치면 읽은 사람·시각, 직원 화면 "안 읽음" 표시 |
| 인수인계 읽음 | #66 | 인수인계 목록 `read.readCount`, 상세 조회 시 읽음 기록·`readers` | 공통 `HandOverList`, 직원 화면에 인수인계 탭 |
| 근무 목록의 동료 이름 | #65 | 근무 목록 `workers` | 직원 근무표에 동료 이름 |
| 오후 시간대 | #65 | `TimeType.AFTERNOON` | 운영 시간대 기반 자동 판단에 사용 |
| 알림 커서 조회·읽음 처리 | #66 | `GET .../alarms?cursor=`, `PATCH .../alarms/{id}/read` | 안 읽은 알림만, 커서 "더보기", 스와이프·× 읽음 처리 |
| 안 읽은 알림 개수·모두 읽음 | #67 | `GET .../alarms/unread-count`, `PATCH .../alarms/read-all` | 배지, "모두 읽음" 버튼 |
| 반복 근무 규칙 | #67 | `POST/GET/PATCH/DELETE .../owner/work-series`, 근무 응답 `seriesId` | 근무 넣기 "매주 반복", 근무 상세 "반복 근무 전체", 근무표 아래 반복 근무 목록·끝내기 |
| 근무 시각 변경 | #67 | `PATCH .../owner/works/{id}`의 `startTime/endTime`(변경 알림) | 근무 상세 "시간 바꾸기" |
| 퇴사 시 남은 근무 정리 | #67 | 직원 제외·퇴사 확정 때 시작 전 배정·반복 참여 삭제 | 프론트 정리 버튼 삭제(서버 자동) |
| 매장 운영 시간대(평일/주말) | #67 | 매장 설정 `weekday/weekend Open/CloseTime` | 설정 > 매장 정보 > 운영 시간대 |
| 개인정보 동의·입력 | #67 | `POST .../me/privacy-consent`, `GET/PUT .../me/personal-info`, `GET .../me`의 `privacyConsented`, 직원 상세 `personalInfo` | `/staff/welcome`, 동의 전 진입 차단, 점주 직원 상세에 개인정보 |
| 직원별 공제 방식 | #67 | 직원 수정 `deductionType`, 급여 응답 `deductionAmount/netPay` | 직원 상세에서 저장, 급여 화면들이 서버 계산값 표시 |
| 개인정보 암호화 키 환경변수 | #68 | `PRIVACY_ENCRYPTION_KEY` | 없음(백엔드 배포 설정) |

## 2. 연동 시 알아둘 규칙

- **timeType과 closing**: 근무·반복 근무·근무 제안 칸 요청의 `timeType`은 필수다. 서버는 이 값을 저장하지 않고 CLOSE인지만 봐서 `closing`(마감 근무 = 인수인계 대상)으로 저장하며, 응답에는 `closing`만 온다. 프론트는 운영 시간대와 근무 시각을 비교해 `timeType`을 정한다(`lib/utils/storeHours.js`: 닫는 시각까지 = CLOSE, 여는 시각부터 = OPEN, 12시 이후 = AFTERNOON, 그 밖 = NORMAL).
- **운영 시간대 미설정**: 값이 null이면 프론트는 기본값(평일 09–22, 주말 10–22)으로 판단하고 설정 화면에 "아직 안 정함"을 표시한다.
- **개인정보 동의 가드**: 백엔드는 동의 전 API 호출을 막지 않는다. 직원 화면 진입 차단은 프론트(`ProtectedLayout`)만 한다.
- **배포 필수 환경변수**: 백엔드 서버 `.env`에 `PRIVACY_ENCRYPTION_KEY`(32바이트 Base64)가 없으면 서버가 뜨지 않는다. 한 번 정하면 바꾸지 않는다. 프론트는 추가 환경변수가 없다(`API_BASE_URL`, `CDN_BASE_URL` 그대로).

## 3. 남은 것 (요청하지 않았거나 선택 사항)

| 항목 | 상태 | 필요해지면 할 일 |
|---|---|---|
| 급여 지급일 알림 | 결정대로 문구만 둠 | 매장 지급일 필드, 3일 전·1일 전·당일 알림 스케줄러 |
| 매출 | 백엔드 도메인 없음(브라우저 목업) | 매출 도메인·API |
| 운영 시간대 기반 timeType 자동 결정 | 선택 | 요청에서 timeType을 생략하면 서버가 운영 시간대로 정해 주면 프론트 계산을 없앨 수 있다 |
| 개인정보 동의 문구 | 초안 | 법무 검토 후 확정, 문구를 바꾸면 `PRIVACY_CONSENT_VERSION` 올리기 |
| 백엔드 compose의 `REFRESH_COOKIE_*` | 참고 | `.env.example`에는 있으나 compose `environment`에 빠져 있어 컨테이너엔 기본값이 쓰인다 |
