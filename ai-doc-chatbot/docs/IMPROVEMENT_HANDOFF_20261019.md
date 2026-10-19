# 작업 인수인계 — 2026-10-19 Claude Code(윈도우)

## 한 일
- 신규 운영 프로그램 「AI 문서 챗봇 자동화」 v1.01 개발·배포(코드·운영 DB·Vercel·도메인·메인 등록).
- 운영 DB(`esgxyikcnnvmlhygjkth`): `pgvector`, 표 4개(RLS), `dcb_match_chunks`, cron 30일 삭제, `platform_guides` 매뉴얼 2개(Upstage·Tavily), `programs`/`pricing_plans` 3/`grade_program_access`(VIP) 등록 → VIP 141명 자동 부여 확인.
- 세션 재시작 후 이번 세션에는 운영 DB용 MCP가 없어(연결된 것은 Lab DB `rjjtjak…`) 루트 `.env.local`의 운영 서버 키로 REST API를 써서 등록했다(URL에 운영 ref가 아니면 중단하도록 확인).

## 확인한 것
- `npm test` 14/14, `npm run build` 성공, Vercel `ai-doc-chatbot-pqf8hmhv7` Ready(production), 도메인 연결.
- 비로그인: `/chat` → 로그인 화면, `POST /api/chat`·`GET /api/documents` 401.
- 크롬: 메인 상세, `/chat`, `/settings` 화면.

## 못 한 것 / 다음 첫 단계
1. 실제 질문 검수 — 주인님이 https://ai-doc-chatbot.buylife.xyz/settings 에서 본인 Upstage 키(필수)·Tavily 키(선택) 등록 → 에이전트가 문서 1개 업로드·질문 1~2회 확인.
2. 카탈로그 썸네일 생성.

## 추가 — 실제 호출 검수 (2026-10-19 오후, Claude Code 윈도우)
- **키 저장 오류 수정**: 설정 화면 저장 시 `user_api_keys_provider_check` 위반 → 공용 허용 목록에 `upstage`·`tavily` 누락이 원인. `supabase/migrations/0003_user_api_keys_upstage_tavily.sql`(현재 목록을 읽어 두 값만 추가)을 주인님이 운영 SQL Editor(`esgxyikcnnvmlhygjkth`)에서 실행 → 저장 성공, `GET /api/settings/api-keys` 두 키 `registered: true`.
- **검수(관리자 계정 주인님 본인 키, 크롬)**:
  - 업로드: TXT 1개(4.3초, 조각 1) · 영어 1쪽 PDF 1개(Upstage document-parse 경유, 11.6초, 조각 1) — 「내 문서」 목록 정상.
  - 문서 질문 1회: 두 문서 내용을 정확히 답하고 📄 출처 칩 2개 표시 ✅
  - 최신 정보 질문 1회: Tavily 웹 검색 실행, 🌐 웹 출처 표시 ✅
- **호출 수**: Upstage document-parse 1쪽, passage 임베딩 2회, query 임베딩 2회, 라우터(solar-mini4) 2회, 답변(solar-pro4) 2회, Tavily 검색 2회. 시험 문서 2개와 채팅방 1개는 30일 뒤 자동 삭제(필요하면 화면에서 삭제).
- **발견한 문제 → `IMPROVEMENTS.md` L7~L10** (수정은 개발 플랜 승인 후 v1.02).

## 추가 — v1.02·v1.03 답변 품질 수정 (2026-10-19 저녁, Claude Code 윈도우)
- **바꾼 파일**: `src/components/chat/Markdown.tsx`(신규), `src/app/(dashboard)/chat/page.tsx`, `src/lib/chat/core.ts`, `src/lib/chat/tavily.ts`, `src/app/api/chat/route.ts`, `tests/chat.test.mjs`, `tests/markdown.test.mjs`(신규), `package.json`(react-markdown·remark-gfm), `src/lib/version.ts`, `supabase/migrations/0004_version_v1_03.sql`.
- **검사**: `npm test` 21/21, `tsc` 통과, `npm run build` 성공. 배포 v1.02 `ai-doc-chatbot-43uwehspk` → v1.03 `ai-doc-chatbot-8oqc48gir`(Ready). DB `programs.version` v1.03(운영 `esgxyikcnnvmlhygjkth`).
- **크롬 재검수(같은 질문 2개)**:
  - 문서 질문: 굵게·목록이 서식으로 표시(L7), 웹 검색 안 함(`webNote: null`, Tavily 0회 — L9), 문서 관련도 0.63·0.61(L10 기준 0.4 통과).
  - 「이번 주 AI 뉴스」: 「2026년 10월 19일 기준」 이번 주 기사(빅테크 실적 주간·AI 반도체주 급락)로 답함(L8), 관련 없는 내 문서 출처 없음(L10).
  - v1.02에서 「2026~2030년」이 취소선으로 바뀐 것을 발견 → v1.03 수정 후 같은 답변을 다시 열어 취소선 0개·범위 표기 정상 확인(추가 유료 호출 없음).
- **호출 수(재검수)**: query 임베딩 2, 라우터 2, 답변 2, Tavily 1(뉴스 질문만).
- **다음 첫 단계**: 관련도 기준은 실제 회원 문서로 다시 점검(문서 출처 `score`). 남은 개선은 `IMPROVEMENTS.md`(L1~L6, U1~U4, C1~C4).

## 추가 — 썸네일·v1.04 화면 편의 (2026-10-19 밤, Claude Code 윈도우)
- **썸네일**: §13 템플릿·`scripts/generate-program-thumbnail.mjs`, `gemini-3-pro-image-preview` 1회, 육안·카탈로그 비교 확인(커밋 `5f1746cf`).
- **v1.04 배포**: `ai-doc-chatbot-nz4l7fiuk`(Ready), DB 버전 v1.04, 테스트 24/24·tsc·빌드 통과.
- **크롬 확인**: 같은 TXT 다시 올리기 → 409 「같은 문서…」(유료 호출 없음) / 진행 단계 `read → chunk → embed → save → done` / 「이 문서로 질문」 → 「warranty_test.pdf」만 참고 표시, 요약 질문 정상 답(관련도 0.31, 웹 검색 안 함) / 출처 칩 → 근거 펼침 / 다시 생성 → 방에 질문 1·답변 1만 남음 / 이름 바꾸기 「보증 정책 요약」·검색 「보증」 필터. 복사 버튼은 표시만 확인(클립보드 권한 때문에 자동 확인 생략).
- **시험 데이터**: `단계표시_시험.txt` 문서 1개 추가(30일 뒤 자동 삭제).
- **호출 수**: 임베딩 passage 2·query 2, 라우터 2, 답변 2.
- **발견**: L12(일반 모드 요약 질문은 관련도가 낮아 문서를 못 찾을 수 있음) → v1.05 L4에서 검토.

## 추가 — v1.05 큰 문서·혼합 검색 (2026-10-19 밤, Claude Code 윈도우)
- **운영 변경**: Storage 비공개 버킷 `dcb-uploads`(50MB, 공개 정책 없음) — 기록 `supabase/migrations/0006_uploads_bucket_v1_05.sql`. DB 표 변경 없음.
- **배포**: `ai-doc-chatbot-pydwrxc91`(Ready), DB 버전 v1.05, 테스트 28/28·tsc·빌드 통과. 테스트가 「39,000원」이 「39」「000원」으로 쪼개지는 문제를 잡아 쉼표 숫자는 키워드에서 빼도록 고침.
- **크롬 확인**:
  - L2: 4.3MB TXT → 서명 주소 업로드 200 → `read→chunk→embed→save→done`, Storage 남은 원본 0개.
  - L3: 101쪽 PDF를 화면 파일 입력에 첨부 → 「100쪽이 넘어 오래 걸리는 방식」 안내·「읽는 중인 큰 문서」 표시 → 1~2분 뒤 「(101쪽)을 12개 조각으로 저장」 → 57쪽에만 있는 사실 질문에 「2026년 3월 3일, 42명」 정답. 진행 목록 비워짐.
  - L4: 「Orbit X1 배터리 교체 비용」 → warranty_test.pdf(0.75), 39,000원.
  - L12: 「복지 규정 핵심만 정리」 → 3항목 정확.
- **호출 수·비용**: Upstage 비동기 문서 읽기 101쪽 1회(약 1,000~1,500원), 임베딩·답변 각 3~4회(웹 검색 끔, Tavily 0회).
- **시험 데이터**: `복지규정_대용량시험.txt`, `annual_report_101p.pdf` 추가(30일 뒤 자동 삭제).
- **새 대기 항목**: L13(흔한 단어 하나만 겹친 문서도 출처에 붙음), L14(조각 400개 한도).

## 추가 — v1.06 남은 항목 (2026-10-19 밤, Claude Code 윈도우)
- **배포**: `ai-doc-chatbot-5dd7m7txa`(Ready), DB 버전 v1.06, 테스트 33/33·tsc·빌드 통과.
- **관련도 기준 점검**: 운영 DB 실데이터는 회원 1명(관리자 시험)·답변 8개뿐 → 0.4 유지, L15로 재집계 조건 기록.
- **크롬 확인**: 「복지 규정 핵심만 정리해줘」 재질문 → 출처 복지규정 1개(출장규정 오탐 사라짐) / 채팅방 목록 정상(`pinSupported:false`, 6개) / 내 문서 「오늘 근거로 쓰임·아직 근거로 안 쓰임」 / 설정 「최근 30일 웹 검색 3회 · 기록 전 검색 3회」.
- **주인님 실행 필요**: `supabase/migrations/0007_rooms_pinned.sql`(운영 SQL Editor) → 실행 뒤 고정 버튼이 나타남. 코드 재배포 불필요.
- **호출 수**: 임베딩 1·답변 1(웹 검색 끔).
