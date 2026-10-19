# AI 문서 챗봇 자동화 (`ai-doc-chatbot`) — 에이전트 인수인계

> 루트 `CLAUDE.md`/`AGENTS.md`(최상위 규칙: 회원 본인 계정·본인 API 키, 생성 데이터 30일 자동 삭제)를 먼저 읽는다.
> 이 폴더는 ① AIMaster 운영 프로그램이다(운영 DB `esgxyikcnnvmlhygjkth`, Lab 아님).

- 라이브: https://ai-doc-chatbot.buylife.xyz (Vercel 프로젝트 `ai-doc-chatbot`, 팀 `buylife`)
- 메인 상세: https://www.buylife.xyz/programs/ai-doc-chatbot
- 현재 버전: **v1.01** (`src/lib/version.ts` = DB `programs.version`)
- 카테고리: Tools / 최소 등급 일반 / 배지 new / 요금 1·2·3개월(1만·2만·3만 원) / VIP 자동 부여

## 1. 사용 목적 및 대상
- **무엇**: 회원이 올린 본인 문서(PDF·DOCX·PPTX·XLSX·HWP·이미지·TXT·MD·CSV)에서 근거를 찾고(RAG), 최신 정보가 필요한 질문은 웹 검색(Tavily)까지 해서 **출처와 함께** 답하는 ChatGPT형 챗봇.
- **대상**: 사내 규정·매뉴얼을 자주 찾는 직장인, 강의 교안으로 공부하는 수강생, 내 자료 + 최신 정보를 함께 봐야 하는 1인 사업자.
- **출발점**: 2026-10-19 주인님이 붙여 주신 강의 실습 과제(「AIMaster Chat」 Upstage 챗봇 → Tavily MCP → RAG 고도화)를 운영 규칙에 맞게 바꾼 것. 바뀐 점은 `docs/PLAN_20261019_AI_DOC_CHATBOT.md` 참고(별도 Google 로그인 대신 AIMaster 공용 로그인, 고정 dataset 대신 회원 본인 문서, 키는 회원 본인 키, 30일 자동 삭제).

## 2. 기술 스택·도구
- Next.js 16.2 App Router(`src/proxy.ts` = 미들웨어), React 19, Tailwind v4, lucide-react, TypeScript.
- Supabase 공용 DB(운영) + `pgvector`(`extensions.vector(1024)`) + `pg_cron`(30일 삭제).
- **Upstage**(회원 본인 키, `user_api_keys.provider='upstage'`)
  - 답변 `solar-pro4`, 웹 검색 필요 판단(라우터) `solar-mini4` — `POST https://api.upstage.ai/v1/chat/completions`
  - 임베딩 `solar-embedding-2-query` / `solar-embedding-2-passage`(1024차원, 요청당 100개) — 옛 `embedding-query/passage` 별칭은 2026-12-31 종료 예정이라 쓰지 않음
  - 문서 읽기 `document-parse` — `POST /v1/document-digitization`(동기 100쪽)
- **Tavily**(회원 본인 키, 선택, `provider='tavily'`): 원격 MCP `https://mcp.tavily.com/mcp/` 도구 `tavily-search`(`@modelcontextprotocol/sdk`), 실패 시 같은 키로 REST `POST https://api.tavily.com/search` 1회.
- 테스트: `npm test`(node:test + tsx, 14개 — `tests/access.test.mjs` 권한 판정 순서, `tests/chat.test.mjs` 조각 나누기·라우터 해석·출처·MCP 결과 해석).

## 3. 핵심 기능·구조·장단점
**화면(좌측 메뉴 순서)**: AI 채팅(`/chat`) · 내 문서(`/documents`) · 📖 연동 & 사용 매뉴얼(`/guide`) · API키등록·플랫폼연동(`/settings`). `/`는 `/chat`으로 보냄. 767px 이하에서는 위쪽 ☰ 메뉴.

**서버 API**
| 경로 | 하는 일 |
|---|---|
| `POST /api/chat` | NDJSON 스트리밍. ① 채팅방 확인/생성 ② 최근 10턴 기록 ③ (내 문서 참고 켜짐 + 조각 있음) 질문 임베딩 → `dcb_match_chunks` 상위 5개(유사도 0.3 미만 버림) ④ (웹 자동 + Tavily 키 있음) 라우터가 웹 필요 판단 → Tavily 5건 ⑤ `meta`(출처) 전송 후 Solar 답변 스트리밍 ⑥ 질문·답변·출처 저장 |
| `GET/POST/DELETE /api/documents` | 목록 / 업로드(최대 30개·4MB, TXT·MD·CSV는 바로 읽고 나머지는 Upstage document-parse → 800자·120자 겹침 조각 → passage 임베딩 → 100개씩 저장, 실패 시 문서 행 되돌림) / 삭제. **원본 파일은 저장하지 않음** |
| `GET/DELETE /api/rooms`, `GET /api/rooms/[id]` | 채팅방 목록·삭제 / 한 방의 메시지 불러오기(방은 첫 질문 때 `/api/chat`이 자동 생성, 제목 = 첫 질문 30자) |
| `GET/POST/DELETE /api/settings/api-keys` | 본인 Upstage·Tavily 키 등록(마스킹 조회) |

모든 API·레이아웃은 `requireProgramAccess()`/`checkProgramAccessApi()`(판정 순서: 정지 → 관리자 → 핸드폰 → FREE → 구독 → 등급+사용기간) + `dynamic="force-dynamic"`·`fetchCache="force-no-store"`. 키가 없으면 다른 키로 대신하지 않고 「본인 키를 등록해 주세요」 안내.

**DB(운영, `supabase/migrations/0001_dcb_init.sql`)**: `dcb_rooms`·`dcb_messages`·`dcb_documents`·`dcb_chunks`(모두 `user_id` + RLS 본인만 조회), 함수 `dcb_match_chunks`(service_role만 실행), cron `dcb-retention-30d`(매일 18:30 UTC, 30일 지난 채팅방·문서 삭제 → 메시지·조각은 연쇄 삭제). 프로그램 등록 기록: `0002_register_program.sql`.

**장점**: 회원 본인 문서 RAG + 필요할 때만 웹 검색(라우터 판단으로 Tavily 호출 절약) + 문서/웹 출처 표시, 원본 파일 미보관·30일 삭제로 저장 부담과 개인정보 위험이 작음, 키는 공용 `user_api_keys`라 다른 프로그램과 재사용.
**단점·한계**: 파일당 4MB(Vercel 요청 한도), 문서 30개, 100쪽 넘는 PDF는 동기 읽기 한도에 걸림, 표·그림은 글로 바뀐 만큼만 검색됨, 문서 조각 검색만(키워드+벡터 혼합 검색·재정렬 없음), 실제 Upstage 호출 검수 미완(아래 5번).

## 4. 버전·변경 이력
| 버전 | 날짜 | 내용 |
|---|---|---|
| v1.01 | 2026-10-19 | 첫 배포. 채팅·내 문서·매뉴얼·키 등록 화면, RAG·웹 검색·출처, 운영 DB 표 4개+RLS+30일 삭제, 키 발급 매뉴얼 2개(Upstage·Tavily, `platform_guides`), 메인 등록(설명·요금 3단계·VIP 141명 자동 부여), 도메인 `ai-doc-chatbot.buylife.xyz` |

## 5. 남은 작업 (백로그: `docs/IMPROVEMENT_BACKLOG.md`)
- [x] **실제 호출 검수**(2026-10-19): 공용 provider 허용 목록에 `upstage`·`tavily` 추가(`0003`) 후 주인님 키 저장 → TXT·PDF 업로드, 문서 질문·최신 정보 질문 모두 동작·출처 표시 확인. 상세: `docs/IMPROVEMENT_HANDOFF_20261019.md`.
- [ ] **v1.02 품질 수정(플랜 승인 대기)**: `docs/IMPROVEMENTS.md` L7 마크다운 표시, L8 최신 질문에 오늘 날짜·Tavily 기간 지정, L9 문서로 답할 수 있으면 웹 검색 생략, L10 문서 유사도 기준 상향.
- [ ] 카탈로그 썸네일 미생성(`thumbnail_url` 비어 있음) — `scripts/generate-program-thumbnail.mjs` 규칙(PLATFORM_PATTERNS §13)대로 생성 필요(유료 이미지 1회, 주인님 확인 후).
- [ ] 개선 후보는 `docs/IMPROVEMENTS.md`.

## 6. 다른 프로그램 연계·확장 아이디어
- `document-translator`(문서번역): 번역한 문서를 바로 챗봇 「내 문서」로 보내 질문.
- `ebook-studio`: 전자책 원고를 올려 독자용 Q&A 챗봇으로 활용.
- `web-crawler` / `competitor-analysis`: 수집한 웹 자료를 문서로 넣어 근거 기반 요약.
- 공용 키 재사용: Upstage·Tavily 키는 `user_api_keys` 공용 항목이라, 앞으로 Upstage OCR·Tavily 검색을 쓰는 프로그램은 다시 등록받지 않고 가져다 쓴다(루트 회원 연동 정보 공용 규칙).
- RAG 엔진(`src/lib/chat/core.ts` 조각 나누기·출처, `dcb_match_chunks` 패턴)은 검증 후 레퍼런스 모듈 후보.

## 7. UI/UX 개선 제안
- 답변 출처 칩을 눌렀을 때 해당 문서 조각 원문을 펼쳐 보기.
- 업로드 진행 단계 표시(읽는 중 → 조각 나누는 중 → 저장 중).
- 채팅방 검색·고정, 답변 복사·다시 생성 버튼.
- 디자인: `docs/DESIGN_HANDOFF.md`(포커스 스튜디오 스타일 — 미드나잇 챗 콘솔 변형).

## 인수인계 문서
- 개발 플랜(승인 원본): `docs/PLAN_20261019_AI_DOC_CHATBOT.md`
- 개선 제안: `docs/IMPROVEMENTS.md` / 백로그: `docs/IMPROVEMENT_BACKLOG.md`
- 디자인: `docs/DESIGN_HANDOFF.md`
- 작업 인수인계: `docs/IMPROVEMENT_HANDOFF_20261019.md`
