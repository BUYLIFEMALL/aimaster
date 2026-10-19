# AI 문서 챗봇 자동화 (ai-doc-chatbot) — v1.04

내가 올린 문서에서 근거를 찾고, 최신 정보가 필요하면 웹까지 검색해 **출처와 함께** 답하는 AIMaster 회원용 AI 챗봇입니다.

- 라이브: https://ai-doc-chatbot.buylife.xyz
- 메인 상세: https://www.buylife.xyz/programs/ai-doc-chatbot

## 7대 항목 요약 (상세는 `AGENTS.md`)
1. **목적·대상**: 사내 자료·강의 교안·업무 문서를 질문 한 줄로 찾고 싶은 회원. 내 문서 + 최신 웹 정보를 한 답변에서 출처와 함께.
2. **기술**: Next.js 16 · Tailwind v4 · Supabase(pgvector·pg_cron) · Upstage Solar(답변·라우터)·Embedding·Document Parse · Tavily MCP(실패 시 REST).
3. **기능**: AI 채팅(채팅방 저장·스트리밍) / 내 문서(최대 30개·4MB, 원본 미보관) / 출처 표시 / 웹 검색 자동 판단 / 30일 자동 삭제. 장점: 본인 문서 근거·출처·저장 부담 적음. 한계: 4MB·100쪽·키워드 혼합 검색 없음.
4. **버전**: v1.04(2026-10-19 — v1.04 화면 편의 L5·L6·U1~U4, v1.01 첫 배포, v1.02 답변 품질 L7~L10, v1.03 물결표 취소선 수정).
5. **남은 일**: 본인 키로 실제 질문 검수, 카탈로그 썸네일 → `docs/IMPROVEMENT_BACKLOG.md`.
6. **연계**: 문서번역·eBook Studio·웹 크롤링 결과를 「내 문서」로, Upstage·Tavily 키는 공용 키로 재사용.
7. **UI 제안**: 출처 원문 펼쳐 보기, 업로드 단계 표시, 채팅방 검색·고정.

## 개발 명령
```bash
npm install
npm test        # 14개
npm run build
vercel deploy --prod --yes --scope buylife   # 배포(윈도우 PC)
```

## 환경변수 (Vercel)
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_MAIN_SITE_URL` (새 이름 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`·`SUPABASE_SECRET_KEY`가 있으면 우선 사용) — AI 키는 환경변수에 두지 않고 회원 본인 키(`user_api_keys`)만 사용합니다.
