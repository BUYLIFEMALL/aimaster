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
