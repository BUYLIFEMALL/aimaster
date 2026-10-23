# 2026-10-22 플랜 — 글자 수 표시 · 목록 출처 표시 · 세로 9:16 (thumbnail-master v1.13)

주인님 승인: 「승인 + 세로 이미지 1회 시험」(빌드 1회, 전략 1회, 이미지 1회).

| 항목 | 내용 |
|---|---|
| 조사 | 목록 API가 `inputs`를 읽지 않음 → `origin:inputs->>origin`·`ratio:inputs->style->>ratio`만(3만 자 문서 제외). 9:16은 Gemini 이미지 모델 지원(기준 `ai-image-studio/lib/providers/registry.ts` 「9:16 모바일 세로형」). 16:9 고정 위치: `gemini.ts` aspectRatio·`prompts.ts` 2곳·CSS 2곳 |
| ① | `charsLabel`: 1,000자 미만 「40자」, 이상 「1.2K자」 |
| ② | 목록 카드 「🔗 SEO 전략 …」·「세로 9:16」 |
| ③ | `Style.ratio`(기본 16:9) → `makeImage` aspectRatio, `imagePrompt`/`editPrompt` 구도 문구(세로: 위 15%·아래 20% 피해 가운데), 결과 칸 세로(높이 min(70vh,640px)). 이미지 연동 코드는 비율 값만 넘김(공용화·프롬프트 공유 없음) |
