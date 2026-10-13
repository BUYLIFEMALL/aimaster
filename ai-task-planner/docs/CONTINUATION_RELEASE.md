# AI 할 일·성과 관리 v1.04 — 후속 기능 구현·검수

2026-10-13 주인님의 “남은 작업 이어가줘” 지시로 WORK_QUEUE의 W01~W05를 재개했습니다. 실제 회원·공급사·두 기기 검수는 아래처럼 별도로 구분합니다.

## 기능별 변경

- **W01 화면 회귀:** 예측 정확도 null은 ‘미측정’. 차트 눈금과 막대 높이는 같은 4단계 척도이며 0건 막대 높이는 0. 공통 CSS의 margin/gap 영향도 해제하여 0 눈금이 막대 기준선에 맞습니다. ‘하루 리셋’은 실제 동작에 맞춰 ‘타이머 정산’으로 수정했습니다. 노트·버튼 접근성 이름과 3열/2열/1열 흐름을 유지했습니다.
- **W02 본인 키·모델·매뉴얼:** GET `/api/keys`는 프로그램 권한을 확인한 회원의 `user_api_keys(user_id, provider=gemini)`만 서버 조회하며 브라우저에는 등록 여부만 반환합니다. 키 등록/변경은 회원이 기존 AIMaster 공통 API 설정에서 직접 합니다. 프로그램 설정은 기존 JSONB의 선택 필드 `settings.aiModel`로 저장해 스키마 변경 없이 이전 기록을 읽습니다. 매뉴얼은 실제 `platform_guides` 게시물 `f442cd37-f1e0-42a7-a3de-f9a9acf47cc4` 팝업입니다.
- **W03 AI 성과 분석:** POST `/api/analysis`에 로그인·프로그램 권한·동일 출처·revision을 적용합니다. 회원이 보낸 작업 데이터 대신 로그인 회원의 서버 기록에서 날짜·분류·검색 범위를 다시 집계합니다. 완료0건/범위300건 초과를 AI 호출 전에 차단합니다. 본인 키가 없으면 등록 팝업. 선택 모델만 1회 호출하며 공급사 오류에 다른 모델/운영자 키 폴백이나 자동 재호출이 없습니다. 미측정은 null/false, 노트는 전송하지 않음, 현재 연도 동적 주입, JSON 결과·제안3개 검사, 미완료 응답/잘못된 JSON/한도/권한/네트워크 오류를 안내합니다. 날짜·필터·revision 변경 시 이전 분석 결과를 제거하고 진행 중 요청을 취소합니다. 분석 결과는 화면에 표시하며 저장하지 않습니다.
- **W04 전체 JSON 가져오기:** 4MiB 파일 한도·앱/스키마 버전·실제 날짜·ID/분류/작업 참조·시각·구간·실행 상태를 검사합니다. 미리보기 후 회원이 확정하면 기존 revision/RPC의 원자적 명령으로 없는 항목만 추가합니다. ID가 같지만 내용이 다른 작업·세션, 기존 날짜 노트는 건너뛰고 충돌 수를 표시합니다. 기존 타이머는 먼저 종료해야 하며 백업의 정지 세션은 종료 상태로 가져옵니다. 설정은 기본적으로 유지하고 ‘백업의 타이머·분석 모델 설정도 적용’을 선택했을 때만 기본 분류ID를 재매핑하여 적용합니다. 중복 시간 구간/한도 초과/실패 시 전체 저장을 중단하고 기존 데이터를 보존합니다. 미저장 노트가 있으면 가져오기를 차단합니다. JSON 파일에 API 키/로그인은 없습니다.
- **W05 CSV:** 상단과 기록 화면에서 같은 내보내기 함수를 사용하며 화면과 같은 날짜·분류·검색·정렬 범위입니다. 범위·제목·분류·우선순위·예상분·계획일·상태·전체기간 실제집중초·측정 여부·UTC 완료시각을 제공합니다. UTF-8 BOM, RFC CSV 따옴표/쉼표/개행 처리, 문자열의 수식 시작 문자 및 선행 공백을 보호합니다.

## 검사와 증거 범위

| 검사 | 결과·범위 |
|---|---|
| `npm test` | 22개 통과: 기존 타이머·공통권한·실제 PGlite SQL, JSON 병합/충돌/시간/한도, CSV 실제 파싱, 분석 입력/응답, 실제 분석·키 API 코드의 격리 회원A/B·권한/CSRF/revision·본인키 제한, 공급사 통신 모의 |
| `npm run test:browser` | 보이는 격리 Chrome 30개 통과. 실제 React 화면 클릭·입력·저장·재조회·모바일·모델 설정·키 안내·오류·분석·가져오기 미리보기/확정·JSON/CSV 다운로드. 데이터/API/AI는 시험 fixture |
| `npm run build` | 프로덕션 빌드·TypeScript 통과. 인증 API 동적 렌더링 |
| `npm run test:runtime` | 실제 Next 프로덕션 서버의 설정 미등록 차단 15개 통과. 실제 회원 로그인 성공 검사 아님 |
| 화면 캡처 | `docs/evidence/continuation/*`. 키 등록/AI 결과 화면은 모의 자료이며 실제 Gemini 결과로 보고하지 않음 |
| 실제 운영 회원 | 미완료. 기존 Chrome 키보드 입력 `window_not_focused`; restore 재시도도 동일. Chrome 실행 명령은 자동 승인 검토의 `blocked by policy`. Aside도 미실행. 인증 우회/비밀번호 입력/운영 데이터 덮어쓰기는 하지 않음 |
| 실제 Gemini | 미완료. 본인으로 로그인된 회원 세션에서 최소 호출로 검수해야 함. 이번에는 실제 유료 생성 호출0회 |
| 두 실제 기기 | 미완료. 격리 충돌/지연 GET/재조회 검사를 실제 두 기기 성공으로 기재하지 않음 |

변경 전 운영 도메인의 배포는 `dpl_4iX1KnLkUFRidz5SiC17mNG5Xrac` READY였습니다. 새 프로덕션 배포·익명/회원 운영 결과는 아래 운영 기록을 이어 적습니다.

## 운영 적용

- 코드 `APP_VERSION` v1.04·package1.4.0. 프로그램 DB 버전 갱신 SQL: `supabase/migrations/20261013120750_planner_continuation_v104.sql`.
- 기존 공유 인증·DB·RPC·SSO·회원 기록은 유지. 새 DB 스키마/환경변수/키 변경·확장 추가 없음.
- 운영: https://ai-task-planner.buylife.xyz/dashboard
- 메인: https://www.buylife.xyz/programs/ai-task-planner
- 검수 후 명시적인 대상 파일만 커밋·푸시하고 `buylife/ai-task-planner`로 프로덕션 배포합니다. 실제 로그인·공급사 검수는 로그인 세션 제공 후 W06와 함께 완료해야 합니다.

## 구현 시 확인한 공식 자료

- [Gemini 모델](https://ai.google.dev/gemini-api/docs/models): 새 작업용3.5 Flash-Lite/3.8 Flash 및3.1 Pro preview. 기존2.5 모델 접근 제한도 확인하여 신규 기본 모델로 사용하지 않음.
- [Gemini 구조화 응답](https://ai.google.dev/gemini-api/docs/structured-output), [generateContent 및 generationConfig](https://ai.google.dev/api/generate-content): REST `responseJsonSchema` 지원과 응답 종료 상태 확인.
- [Supabase 조회](https://supabase.com/docs/reference/javascript/select), [10월12일 TLS 변경](https://supabase.com/changelog/cbc-tls-ciphers-deprecated): 현대 Node fetch/기존 SDK 경로를 유지하며 스키마·권한 변경 없음.
