# AI 4컷 만화 자동화 (four-cut-comics) — 작업 지침 (v1.03)

- 이어서 작업하는 CLI/계정은 **먼저 `docs/CLI_HANDOFF.md`(현재 상태·남은 작업 순서)와 `docs/DEVELOPMENT_PLAN.md`(원본 분석·전체 플랜)를 읽는다.** 루트 `CLAUDE.md`·`docs/ERROR_LESSONS.md`도 함께.
- 프로그램명 "AI 4컷 만화 자동화"(주인님 확정 2026-10-14), slug `four-cut-comics`, 폴더 `AIMaster/four-cut-comics`.
- 원칙: 본인 Gemini 키만(폴백 금지), 이미지 서버 저장 금지, 모든 쓰기·유료 호출에 `checkProgramAccessApi`, 당해 연도(2026) 프롬프트 주입, 인물 한국인 기본, 흰색 UI, 버전 `v1.01` 시작(`lib/version.ts`+DB `programs.version`).
- 상태(2026-10-14 밤): v1.03 배포(모바일 셸 수정) — v1.02 AI 자동 말풍선·말풍선 직접 배치 편집(`src/lib/comic/balloon.ts`·`/api/balloon`·`BalloonEditor.tsx`). 남은 일: 실제 휴대폰 터치 확인, 인스타 문구·이어서 만들기 등. 상세는 docs/CLI_HANDOFF.md §6.
