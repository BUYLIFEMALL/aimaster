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
