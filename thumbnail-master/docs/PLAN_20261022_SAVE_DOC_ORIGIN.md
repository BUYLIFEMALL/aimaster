# 2026-10-22 플랜 — 참고 문서 저장 · SEO 전략 표시 (thumbnail-master v1.12)

주인님 승인: 「승인, AI 호출 없이」(빌드 1회).

| 항목 | 내용 |
|---|---|
| 조사 | `thumbnail_master_projects.inputs`가 `jsonb` → DB 칸 추가 없이 `inputs.doc`·`inputs.origin`. 새로 만들기(POST)·고치기(PUT)·불러오기(`loadOwned`) 모두 `cleanInputs`를 거침 |
| ① | `Inputs.doc?: RefDoc{name,text,truncated}` — 올린 파일·SEO 대본 모두 자동 저장, ✕는 지움. v1.11 탭 저장소 경유(`stashSeoDoc`/`takeSeoDoc`)는 필요 없어 삭제 |
| ② | `Inputs.origin?`(60자) — 「SEO 전략 A · 호기심 유발형」, 1단계 제목 아래 「🔗 …에서 시작한 프로젝트」 |
| ③ 보류 | 원스톱 유튜브 업로드에 썸네일 지정: 썸네일은 가로 16:9(`aspectRatio: "16:9"`), 원스톱 영상은 세로 9:16(1080×1920)이라 맞지 않음 + 원스톱에 썸네일 지정 기능 없음 → 아이디어 표에 보류 기록 |
