# 2026-10-22 플랜 — 리메이크 문구 장별 겹침 테두리 · 릴스 받아쓰기 → AI 쇼츠 원스톱 (INSTA v1.58 · 원스톱 v1.32)

주인님 승인: 「승인, 2·3 진행」(v1.57 보고의 추가개선 제안 3가지 중 2·3번). 1번(쇼츠 바이럴 스튜디오에 같은 검사)은 제외 — 그 프로그램은 대본 생성에 원본 쇼츠 대사를 넣지 않고 기획(제목·1초 훅·전략)만 넣어 베낄 원문이 없음(`shorts-viral-studio/src/lib/ai/pipeline.ts` `generateScriptAI`). 제안 당시 판단이 틀렸던 것을 정정.

| 단계 | 내용 |
|---|---|
| ① INSTA v1.58 | 문구 화면 장마다 원문과 6어절 겹침 검사(브라우저) → 노란 테두리·「⚠ 겹침」, 고치면 사라짐. 떡상 리메이크 원문에 받아쓰기가 있으면 「🎬 이 대사로 쇼츠 만들기」 → 원스톱 `/topic` 새 탭 |
| ② 원스톱 v1.32 | 주소 `#ref-transcript=` 대사를 참고 자료의 「[레퍼런스 쇼츠 대본 — 「인스타 릴스」…]」 블록으로 넣고 `#` 지움 → v1.30 베끼기 방지 그대로 |
| 넘기기 약속 | 공용 기준 `reference-copy-guard`(`shorts-onestop-studio/src/lib/reference.ts`)에 `REF_HASH`·`refHandoffHash`·`readRefHandoff` — 양쪽이 같은 함수 사용(사본 INSTA `referenceCopy.ts`) |
| 검수 | tsc·시험·build, 크롬(시험 회원) — AI 호출 없이 저장된 ETF 작업으로 |
| 비용 | Vercel 빌드 2회, AI 0회, DB 버전 값 2곳 |
