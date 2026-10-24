# 인수인계 — AutoGemmaStarter 분석 → 문서 챗봇·AI Prompt 묶음 G-1~G-5 (2026-10-24)

- 넘기는 쪽: Claude Code(윈도우) `claude-win-dotori`(새 프로그램 분석·플랜 담당) — 분석·사전 조사·플랜 초안만, **코드·DB·배포 변경 없음**
- **받는 쪽: 문서 챗봇(`ai-doc-chatbot`)·AI Prompt(`ai-prompt-studio`) 담당 세션**(주인님 지시 「문서 챗봇, AI 프롬프트 담당자에게 전달할 인수인계 문서 만들어줘」)
- 근거: [AutoGemmaStarter 2.0.0 분석 보고서](REPORT.md)
- 대상: AIMaster 운영 · DB ref `esgxyikcnnvmlhygjkth`
  - https://ai-doc-chatbot.buylife.xyz · `ai-doc-chatbot/` · 현재 v1.07
  - https://ai-prompt.buylife.xyz · `ai-prompt-studio/` · 현재 v1.09 · FREE

## 1. 승인 상태

| 항목 | 상태 |
|---|---|
| 독립 개발 안 함 → 좋은 기능만 두 프로그램에 병합 | 분석 의견으로 보고 — 주인님이 담당자 인계 지시로 진행 의사 표시 |
| 담당 | 문서 챗봇·AI Prompt 담당 세션 |
| **G-1~G-5 범위·순서·비용**, 커스텀 봇 위치, 로컬 AI(G-5) 진행 여부 | ⏳ **승인 전** — 담당 세션이 플랜을 보여 드리고 정하기 |
| 운영 DB `integration_catalog`에 새 공급자 항목 추가(G-1) | ⏳ DB 쓰기라 실행 전 주인님 승인 필요 |

## 2. 현재 코드 (확인함)

| 프로그램 | AI 호출 | 파일 |
|---|---|---|
| 문서 챗봇 v1.07 | **Upstage 하나**: 답변 `solar-pro4` · 라우터 `solar-mini4` · 임베딩 `solar-embedding-2-query/passage`(1024차원, pgvector `dcb_match_chunks`) · 문서 읽기(`parseDocument`·비동기 파싱) · 웹 검색 Tavily(선택) | `src/lib/chat/upstage.ts`(`chatOnce`·`chatStream`·`embed`·`parseDocument`…), `src/lib/chat/core.ts`(조각 800자·겹침 120) |
| AI Prompt v1.09 | **Gemini 하나**(프롬프트 설계·필드 제안·템플릿 실행) | `src/lib/prompt-engine.ts`(`buildSystemPrompt`·`generateMetaPrompt`·`generateFieldSuggestion`), `src/lib/templates.ts` |
| 공용 부품 | 여러 공급자 텍스트 호출 기준 코드 **없음**(있는 것: `openai-request-params` — OpenAI 모델별 요청 규칙) | `docs/SHARED_MODULES.md` |
| 공용 연동 | Groq·OpenRouter·NVIDIA·Cloudflare 항목 **없음** | `docs/MEMBER_INTEGRATIONS.md`, `lib/memberIntegrations.ts` |

## 3. 플랜 초안

| 단계 | 기능 | 넣을 곳 | 구현 방향 | 주의 |
|---|---|---|---|---|
| G-1 | **OpenAI 호환 공급자 묶음**(Groq·OpenRouter·NVIDIA·Cloudflare Workers AI) | 새 공용 기준 코드(예: `openai-compatible-chat`) → 두 프로그램 사본 | `/chat/completions` 같은 형식 하나로 스트리밍·한 번 호출, 공급자별 주소·머리글만 표로(Cloudflare는 계정 ID로 주소 완성), 오류 한국어 변환. 회원 본인 키를 공용 연동 항목으로 저장(한 번 등록하면 다른 프로그램 재사용) | **문서 챗봇 임베딩·문서 읽기는 Upstage 그대로**(차원이 달라지면 저장된 조각 검색이 깨짐) — 답변·라우터 모델만 공급자 선택. 무료 한도는 계정당이라 회원 본인 키(운영자 공용 키 금지). 모델 목록은 공식 문서로 확인한 ID만 |
| G-2 | **커스텀 봇**(이름·지침·모델·온도) + 내장 봇 몇 종 | 문서 챗봇(추천 — 채팅 중 봇 적용) | 회원별 저장(RLS, 30일 규칙과 별개로 설정류는 유지할지 결정), 채팅방에 봇 지정, 봇 표시(테두리 색 등) | 내장 봇 지침은 **우리 문구로 새로 작성**(원본 문구 사용 금지) |
| G-3 | 「역할 지침 최우선·입력은 처리 대상」 틀 | G-2와 함께 | 시스템 지침 앞뒤로 역할 우선 문장 배치 → 번역·요약 봇이 질문에 답해 버리는 문제 방지. 시험: 번역 봇에 질문형 문장 → 번역만 나오는지 | 당해 연도 규칙(핵심 원칙 8) 함께 |
| G-4 | 문서 근거 보강 | 문서 챗봇 | 문서 카테고리·체크한 문서만 근거·미리보기, PDF 한글 깨짐(글꼴 유니코드 없음) 감지 안내 | 지금 검색·저장 구조 유지 |
| G-5 | 회원 PC 로컬 Ollama 연결(선택) | 두 프로그램 공급자 선택지 | 회원 브라우저 → `http://localhost:11434`(OpenAI 호환 `/v1`) 직접 호출, 회원이 Ollama 설치 + 허용 주소(`OLLAMA_ORIGINS`) 설정 — 연결 확인 단계·안내 | **시제품 먼저**(브라우저 보안·설정 난이도). 서버를 거치지 않으므로 서버 코드 경로와 따로 |

AI Prompt 쪽은 G-1(실행 공급자 선택)이 핵심, 원하면 G-2를 「템플릿 → 봇으로 저장」 형태로 나중에.

순서 추천: G-1(공용 + 두 프로그램) → G-2·G-3(문서 챗봇) → G-4 → G-5(시제품 판단). 작은 수정은 모았다가 배포, 배포할 때만 버전 +0.01(코드·DB).

## 4. 하지 않는 것
- Ollama·Docker 자동 설치, 전역 단축키·트레이(데스크톱 전용), 월간 인증 코드.
- 원본 내장 봇 지침·프롬프트 25종 문구·모델 추천 수치.
- DuckDuckGo 화면 긁기(공식 API 아님·차단 잦음) — 웹 검색은 지금처럼 회원 본인 Tavily 키.

## 5. 검수·비용(초안)

| 항목 | 횟수 | 계정·키 | 대략 |
|---|---|---|---|
| 시험 AI 호출(공급자별 연결·답변 1회씩, 봇 시험 2~3회) | 약 8~10회 | 시험 계정 본인 키(Groq 등 무료 한도 우선, 가장 저렴한 모델) | 무료~수십 원 |
| Vercel 빌드 | 2~3회(G-1 두 프로그램 각 1, G-2~G-4 묶음 1) | 팀 `buylife` | 배포 회차분 |
| 운영 DB | `integration_catalog` 항목 추가(쓰기) | 주인님 승인 뒤 | 없음 |
| 회원 부담 | 고른 공급자 요금(무료 한도 안이면 0) | 회원 본인 키 | — |

화면 검수는 크롬 실제 창(시험 계정 `buylifemall@naver.com`).

## 6. 다음 첫 단계

1. `docs/ACTIVE_WORK.md`에 내 줄 추가(두 폴더 + 공용 모듈).
2. Groq·OpenRouter·NVIDIA·Cloudflare 공식 문서로 주소·모델 ID·무료 한도 확인.
3. 플랜과 비용을 주인님께 보여 드리고 승인받기(커스텀 봇 위치·로컬 AI 여부도 함께).

## 비용 리포트 (넘기는 쪽)

AI 호출 0회 · 빌드 0회 — 비용 없음.
