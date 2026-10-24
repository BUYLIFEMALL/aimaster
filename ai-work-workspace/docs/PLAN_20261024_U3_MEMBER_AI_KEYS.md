# U3 — 회원 본인 AI 키로 AI 열기 (상세 플랜)

- 상위 플랜: [PLAN_20261024_EXPANSION_ROADMAP.md](PLAN_20261024_EXPANSION_ROADMAP.md) §5 U3 · 작성 2026-10-24 · Claude Code(윈도우) `claude-win-20261024-workspace`
- 대상: ① AIMaster 운영 · 현재 v1.04 · 공용 DB ref `esgxyikcnnvmlhygjkth`
- **최상위 규칙**: 회원 본인 키만 쓴다. 키가 없으면 다른 회원·운영자 키로 대신하지 않고 「본인 키를 등록해 주세요」 안내만 한다(운영자 환경변수 키는 1단계부터 읽지 않게 막아 둠).
- **DB 변경 없음**: 키는 공용 표 `user_api_keys`(회원별 `provider` 한 줄)를 그대로 쓴다.

## 1. 조사 결과 (2026-10-24)

| 항목 | 지금 상태 |
|---|---|
| 회원 키 저장 | 공용 표 `user_api_keys(user_id, provider, api_key)`, 제공자 이름 `openai`·`anthropic`·`gemini`·`perplexity` — 메인 사이트 「API 설정」 화면(`app/(dashboard)/api-settings/page.tsx`)이 회원 본인 세션으로 직접 저장(`onConflict: user_id,provider`) |
| 회원 id | 이 프로그램의 원본 사용자 id = Supabase 회원 id(`src/server/member.ts`) → `user_api_keys.user_id`로 바로 찾을 수 있음 |
| 키 넣는 자리 | `withMemberAiKeys()`(`src/litpage/server/ai/providers/config.ts`) — 요청 동안 회원 키를 쓰는 장치. 1단계에서 만들어 둠, 아직 아무도 부르지 않음 |
| AI 스트림 | 화면은 `/api/ai/stream`(SSE)을 부르는데 **껍데기(Next)에 이 라우트가 없음**. 원본 처리 코드는 `src/litpage/server/aiStream.ts`(채팅·글쓰기·AI 블록·에이전트 4종) |
| 서버 차단 | `src/server/stagePolicy.ts`가 `ai*` 명령 전체를 막고 있음 |
| 화면 스위치 | `AI_STAGE_OPEN=false`(`web/features/ai/aiApi.ts`) — **AI 회의록 블록도 같은 스위치를 씀**(U6 전까지 회의록은 닫혀 있어야 함) |
| 키 없음 안내 | `web/features/ai/NoKeyNotice.tsx`가 「서버 `.env.local`에 키를 넣으라」는 원본 개발자용 문구(영어) |
| 기본 모델 | Claude 기본값이 가장 비싼 `claude-opus-5-5`(`server/ai/models.ts`). 빠른 작업(제목·자동 채우기 등)은 빠른 모델을 따로 씀 |
| 서버 문구 | 오류 문구에 AI 이름 「AIMaster」가 영어로 남음(`ai/client.ts`·`providers/anthropic.ts`·`providers/openai.ts`·`agents/runs.ts`·`ai/image.ts`), AI 지시문(`ai/prompts.ts`)도 「You are AIMaster」 |
| 키 등록 화면 | 이 프로그램에는 없음(AIMaster 표준: 「API키등록·플랫폼연동」 화면 + 연동 매뉴얼 상자) |

## 2. 범위

**연다**: AI 질문(채팅), 글쓰기 도우미, AI 블록, 수식 AI, 데이터베이스 자동 채우기, AI 채팅 기록 목록·이름 바꾸기·고정·삭제·되돌리기·피드백, 설정 「AI 비서」 탭(지시문·기본 모델).

**계속 닫는다**: 맞춤 에이전트(U12), 외부 연결·MCP(`aiListConnections`·`aiUpdateConnection`·`aiRemoveConnection`·`aiDisconnectAllConnections`·`aiUpdateMcpAllowlist`, U14), AI 채팅 공유(`aiShareThread`·`aiSharedThreads`, 협업 단계), AI 그림(U2에서 숨김), AI 회의록(U6).

## 3. 구현 순서

1. **회원 키 읽기** `src/server/memberAiKeys.ts`(새 파일): 서버 키(service role)로 `user_api_keys`에서 그 회원의 `openai`·`anthropic` 줄만 읽음. 요청 사이 짧은 메모리 캐시(60초, 회원별) — 키를 지우거나 바꾸면 1분 안에 반영. 다른 회원 키·운영자 키로 대신하는 길은 만들지 않음. 키 값은 기록(로그)에 남기지 않음(원본 `scrub()` 유지).
   - 두 키가 다 있으면: 회원이 설정 「AI 비서」에서 고른 제공자, 고르지 않았으면 Claude 우선(원본 순서와 반대 — Claude 쪽 원본 기능이 더 많음. 구현 때 원본 시험으로 확인).
2. **RPC 라우트**(`src/app/api/rpc/[name]/route.ts`): `runRpc` 전체를 `withMemberAiKeys(회원 키, …)`로 감쌈 → 자동 채우기처럼 요청 뒤에 이어지는 AI 작업도 같은 회원 키를 씀.
3. **AI 스트림 라우트** `src/app/api/ai/stream/route.ts`(새 파일): 원본 `aiStream.ts`의 채팅·글쓰기·AI 블록 처리를 Next 스트림(SSE, `ReadableStream`)으로 옮김. 순서: 같은 사이트 확인 → `checkProgramAccessApi()`(로그인 + 이용 권한) → 회원 키 읽기(없으면 400 `no_key`) → 요청 한도(`aiAllowed`) → `withRequestCache` + `ensureMember` + `withMemberAiKeys` 안에서 실행. 중단(화면 「멈춤」) 시 생성 중단, 15초마다 연결 유지 신호, `maxDuration = 300`, `force-dynamic`·`force-no-store`. 에이전트 종류(`kind: 'agent'`)는 403.
4. **서버 차단 풀기**(`stagePolicy.ts`): `ai*` 접두어 차단을 지우고 §2 「계속 닫는다」 명령만 목록으로 남김. 회의록 명령·에이전트(`/Agent/`)·MCP는 그대로.
5. **화면 스위치 나누기**: `AI_STAGE_OPEN=true`, 회의록용 `MEETINGS_AI_OPEN=false`를 새로 두고 `MeetingNotes.block.tsx`가 이것을 보게 바꿈. 설정 숨김 목록(`trimPolicy.ts`)에서 `lit-ai` 줄을 지워 「AI 비서」 탭을 다시 엶(탭 안의 외부 연결·스킬 묶음은 숨김).
6. **키 없음 안내 다시 쓰기**(`NoKeyNotice.tsx`): 「AI 비서를 쓰려면 본인 OpenAI 또는 Claude API 키를 등록해 주세요」 + **「API키등록·플랫폼연동 열기」** 버튼. 채팅·글쓰기·AI 블록에서 키가 없으면 이 안내가 뜸(기존 `no_key` 흐름 재사용).
7. **「API키등록·플랫폼연동」 화면** `src/app/settings/keys/page.tsx`(새 파일, AIMaster 표준 메뉴 이름): OpenAI·Claude 키 입력·저장·삭제(메인 사이트 「API 설정」과 같은 표·같은 방식 → 한 번 등록하면 다른 프로그램도 그대로 씀), 키는 앞 몇 글자만 보여 줌, 맨 아래 **「📖 연동 매뉴얼」 상자**(`platform_guides`의 OpenAI·Claude 매뉴얼을 팝업으로). 좌측 메뉴 아래쪽(「연동 & 사용 매뉴얼」 위)에 메뉴 추가.
8. **기본 모델**: Claude 기본값을 `claude-sonnet-5-5`로(가장 비싼 Opus는 회원이 직접 고를 때만), 빠른 작업은 `claude-haiku-5-5`. OpenAI는 원본 자동 선택(목록에서 기본·빠른 모델)을 유지하고 시험에서 실제로 고른 모델을 확인해 기록.
9. **한국어 문구**: 서버 오류 문구의 「AIMaster」를 한국어 문장 + 「AI 비서」로(키 거절·한도 초과·일시 장애·요청 처리 실패 등). AI 지시문은 「You are AI 비서 (the assistant built into AI 업무 워크스페이스)」로 바꾸고 답변 언어는 회원 화면 언어(기본 한국어)를 따르게 함 — 원본 시험이 문구를 확인하면 기대값만 고침.
10. **당해 연도**: AI 지시문에 「현재 연도는 ${new Date().getFullYear()}년」 기준 문장 추가(핵심 원칙 8).

## 4. 검수 방법

- **무료 검사**: 타입 검사, 원본 서버 시험 522개(가짜 키 + 로컬 가짜 서버로 AI 흐름 시험 — 비용 없음), 연결부 시험 13개 + 새 시험(회원 키 없음 → `no_key`, 다른 회원 키를 읽지 않음, 키 캐시 회원별 분리, 스트림 라우트 권한 확인), 로컬 빌드.
- **유료 시험(실제 AI 호출)**: 배포 뒤 시험 계정(`buylifemall@naver.com`) **본인 키**로만, 가장 싼 모델(Claude Haiku 또는 OpenAI 소형 모델)로 **10~20회**: AI 질문 3회, 글쓰기 3회, AI 블록 3회, 자동 채우기·수식 AI 각 1~2회, 키 삭제 후 안내 확인. 시험 계정에 OpenAI·Claude 키가 없으면(회원 대부분이 Gemini 키만 있음) 그 사실을 보고하고 U4(Gemini 연결) 뒤 시험한다 — 다른 계정 키로 대신하지 않음.
- **크롬 확인**: 키 없는 상태 안내 → 키 등록 화면 → AI 질문 응답(한국어) → 좌측 메뉴 → 휴대폰 폭. 주인님 페이지는 고치지 않고 시험용 페이지 하나를 만들어 쓰고 끝나면 휴지통으로.

## 5. 비용

| 구분 | 항목 | 내용 |
|---|---|---|
| 개발·시험 | Vercel 빌드 | 1회(필요하면 수정 배포 1회 더, 최대 2회) — 배포 직전 승인 |
| 개발·시험 | 유료 AI 시험 | 시험 계정 본인 키, 저가 모델 10~20회. 1회당 대략 1원~수십 원 수준(정확한 단가는 시험 직전 공식 가격표로 확인해 보고) |
| 운영자 인프라 | 없음 | 키는 회원 것, 운영자 키 사용 없음 |
| 회원 부담 | AI 사용료 | 회원 본인 키로 청구. 기본 모델을 Opus → Sonnet으로 낮춰 부담을 줄임 |

## 6. 버전·배포·문서

- AI 기능이 처음 열리는 큰 변경이고 실제 화면·호출 검수가 다음 단계의 전제라 **바로 배포**(작은 수정 모으기 예외 ②). v1.05.
- 문서: IMPROVEMENTS·BACKLOG·AGENTS·README(기능 표·회원 키 안내), 연동 & 사용 매뉴얼에 「AI 비서 시작하기」 단계 추가, 메인 사이트 상세 소개는 기능이 바뀌므로 다음 단계(U4) 뒤 한 번에 갱신, 루트 HANDOFF·프로그램 비교표, `docs/TOP_RULE_PERSONAL_ACCOUNT_API.md` 점검 결과.
