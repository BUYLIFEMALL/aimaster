# U4 — Gemini 연결 + AI 채팅 기록 30일 자동 삭제 (상세 플랜)

- 상위 플랜: [PLAN_20261024_EXPANSION_ROADMAP.md](PLAN_20261024_EXPANSION_ROADMAP.md) §5 U4 · 작성 2026-10-24 · Claude Code(윈도우) `claude-win-20261024-workspace`
- 대상: ① AIMaster 운영 · 현재 v1.05 · 공용 DB ref `esgxyikcnnvmlhygjkth` · **DB 표 구조 변경 없음**(기존 `aww` 표의 오래된 줄만 삭제)
- 최상위 규칙: 회원 본인 Gemini 키만 쓴다. 키 없으면 등록 안내, 다른 키로 대신하지 않는다.

## 1. 왜 필요한가
- 다른 AIMaster 프로그램 코드에서 회원 키 제공자 이름은 `gemini`가 압도적(83곳, `openai` 3곳). 회원 대부분은 Gemini 키만 있어 지금은 AI 비서를 못 쓴다.
- 생성 데이터 30일 자동 삭제(최상위 규칙 + 1단계 결정 §7-1): AI 채팅 기록·AI 실행 기록·임시 캐시는 30일 뒤 삭제. 회원이 쓴 페이지·데이터베이스(AI가 만들어 준 페이지 포함)는 회원 업무 자료라 대상 아님.

## 2. 조사 결과 (2026-10-24)

| 항목 | 지금 상태 |
|---|---|
| AI 제공자 구조 | 원본은 Anthropic 형식(`ClaudeLike`)을 기준으로 쓰고, OpenAI는 어댑터가 요청·스트림을 바꿔 줌(`providers/openai.ts` 286줄 + 변환 `providers/responses.ts` 894줄). Gemini 어댑터는 없음 |
| Gemini 글 생성 공용 코드 | 없음(공용은 이미지 `gemini-image-client`뿐) → 이번 어댑터가 새 기준 후보 |
| 다른 프로그램의 Gemini 모델 이름 | `gemini-2.0-flash`부터 `gemini-3.1-pro-preview`까지 제각각 → 하드코딩하지 않고 회원 키로 모델 목록을 받아 고르는 방식(OpenAI 어댑터의 `/models` 방식과 같음) |
| AI 기록 표 | `aww.ai_threads`(만든 시각 `created_time`), `ai_messages`, `ai_changes`(되돌리기 기록), `agent_runs`, `ai_formula_feedback` |
| 매일 정리 작업 | Vercel 예약 호출 `/api/cron/jobs`(하루 1회, `CRON_SECRET`) → 원본 예약 작업 실행. 여기에 AI 기록 정리를 더하면 됨 |

## 3. 구현 순서

### 3-1. Gemini 어댑터 (가장 큰 부분)
1. `providers/gemini.ts` + 변환 `providers/geminiTranslate.ts`(새 파일): 원본 Anthropic 형식 요청 → Gemini `models/{모델}:streamGenerateContent?alt=sse`(키는 주소가 아니라 `x-goog-api-key` 머리글로만 보냄, 기록에서 가림).
   - 시스템 지시문 → `systemInstruction`, 대화 → `contents`(user/model), 이미지 → `inlineData`
   - 도구(페이지 찾기·만들기·고치기 등) → `functionDeclarations`(JSON 스키마를 Gemini가 받는 형태로 정리), 도구 호출·결과 → `functionCall`·`functionResponse`
   - 스트림 → 원본이 쓰는 이벤트(글자 조각·도구 호출·끝·사용량)로 바꿈, 「멈춤」 시 중단, 응답이 오래 없으면 끊기, 일시 오류만 재시도(유료 생성 중복을 피해 횟수 최소)
   - 생각 깊이 → `thinkingConfig`(빠른 작업은 낮게)
   - 웹 페이지 읽기(`web_fetch`)는 OpenAI 어댑터가 쓰는 서버 읽기 코드(`webFetch.ts`·`safefetch.ts`)를 그대로 재사용. **웹 검색은 1차에서 제외**(Gemini 검색 도구는 다른 도구와 함께 쓸 때 제약이 있어 확인 후 다음 단계) — 검색을 고른 경우 「Gemini에서는 아직 웹 검색을 쓸 수 없습니다」 안내
   - 오류 문구 한국어(키 거절 → 「등록한 Gemini API 키가 거절됐습니다…」, 한도 초과, 일시 장애)
2. 모델 목록 `providers/geminiModels.ts`: 회원 키로 모델 목록을 받아(캐시) 글 생성 가능한 모델만 고르고, **기본 = 목록의 최신 Flash 계열, 빠른 작업 = Flash-Lite 계열**(가장 비싼 Pro는 회원이 직접 고를 때만). 실제로 고른 모델 이름은 시험 때 기록.
3. 제공자 선택(`providers/config.ts`·`client.ts`·`models.ts`): `MemberAiKeys`에 `geminiKey` 추가. **채팅 모델 목록에 회원이 키를 가진 제공자의 모델을 모두 보여 주고, 고른 모델로 제공자를 정한다**(예: Claude·Gemini 키가 둘 다 있으면 Sonnet·Haiku·Gemini Flash가 함께 보임). 모델을 고르지 않은 「자동」이면 **Claude → OpenAI → Gemini** 순서(지금과 같은 원칙).

### 3-2. 회원 키·화면
4. `src/server/memberAiKeys.ts`: `gemini` 줄도 읽음. `/api/keys`·키 화면에 **Gemini 칸** 추가(형식 확인: `AIza`로 시작), 📖 연동 매뉴얼에 Gemini 매뉴얼 연결(`platform_guides`에서 글 번호 확인).
5. 키 없음 안내·키 화면 문구를 「OpenAI·Claude·Gemini 중 하나」로.

### 3-3. AI 채팅 기록 30일 자동 삭제
6. `src/server/aiRetention.ts`(새 파일): 만든 지 30일이 지난 `ai_threads`와 그 대화의 `ai_messages`·`ai_changes`, 30일 지난 `agent_runs`·`ai_formula_feedback`를 삭제. 회원 페이지·데이터베이스는 건드리지 않음. 한 번에 지울 줄 수에 상한(예: 회당 5,000줄)을 두고 나머지는 다음 날.
7. `/api/cron/jobs`(매일 1회)에서 원본 예약 작업 다음에 실행, 지운 개수를 응답에 남김.
8. 연동 & 사용 매뉴얼·키 화면에 「AI 채팅 기록은 30일 뒤 자동 삭제」 안내 한 줄.

### 3-4. 함께 내보낼 미배포분
- 슬래시 「AI 이미지」 숨김(`768bf908d`).

## 4. 검수 방법
- **무료 검사**: 타입 검사, 원본 서버 시험 522개, 연결부 시험 + **새 시험**: Gemini 변환(요청 모양·도구 호출 왕복·이미지·스트림 글자·오류 코드 매핑·키가 주소에 안 들어감·멈춤) — 가짜 서버로 돌려 비용 없음. 30일 삭제(31일 전 대화·메시지는 지워지고 29일 전과 회원 페이지는 남음), 회원 키 읽기(gemini 포함), 로컬 빌드.
- **유료 시험**(배포 뒤): 시험 계정 **본인 Gemini 키**로만, 가장 싼 모델로 **10~20회** — AI 질문 3회, 페이지 만들기(도구 사용) 2회, AI 블록 2회, 글쓰기·자동 채우기·수식 AI 각 1~2회(U3에서 못 한 항목도 이번에 함께). 시험 계정에는 Claude 키도 있으므로, 채팅 모델 목록에서 Gemini 모델을 직접 골라 시험한다(3-1의 3번). 다른 계정 키로 대신하지 않는다.
- **크롬 확인**: 키 화면 Gemini 칸, 채팅 모델 목록에 Gemini 모델, 한국어 답변, 휴대폰 폭. 시험 페이지는 끝나면 휴지통으로.

## 5. 비용

| 구분 | 항목 | 내용 |
|---|---|---|
| 개발·시험 | Vercel 빌드 | 1회(수정 필요하면 최대 2회) — 배포 직전 승인 |
| 개발·시험 | 유료 AI 시험 | 시험 계정 본인 Gemini 키, 가장 싼 모델 10~20회. Gemini Flash-Lite·Flash는 1회당 1원 안팎~수 원 수준(정확한 단가는 시험 직전 Google 공식 가격표로 확인해 보고) |
| 운영자 인프라 | 없음 | 매일 정리 작업은 기존 하루 1회 예약 호출에 얹음(추가 호출 없음) |
| 회원 부담 | AI 사용료 | 회원 본인 Gemini 키로 청구. 무료 등급 키도 한도 안에서 동작 |

## 6. 버전·배포·문서
- 회원 대부분이 AI를 처음 쓰게 되는 큰 변경이라 **바로 배포**(예외 ②). v1.06.
- 문서: IMPROVEMENTS·BACKLOG·AGENTS·README, 연동 & 사용 매뉴얼(AI 비서 시작하기 — 키 등록 3종·30일 삭제), 메인 사이트 상세 소개 갱신(AI 비서 추가 — `programs.description`·`detail_sections`, 저장 전 백업), 루트 HANDOFF·PENDING_DEPLOYS·프로그램 비교표, 공용 기준 코드 후보로 「Gemini 글 생성 어댑터」 등록(`docs/PROGRAM_IDEA_BACKLOG.md`).
- 작업 크기가 커서(어댑터 약 800~1,200줄 + 시험) 구현은 「어댑터·시험 → 키·화면 → 30일 삭제」 순서로 커밋을 나눈다.
