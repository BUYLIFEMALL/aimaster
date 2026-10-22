# 미배포 대기 목록 (PENDING_DEPLOYS.md)

> 2026-10-22 신설(Claude Code 윈도우, 주인님 승인 — 추가개선 제안 「미배포 대기 항목을 한곳에」).
> 근거 지침: 루트 `CLAUDE.md` 최상단 「작은 소스 수정은 모았다가 배포한다」(2026-10-22 23:17) · [`docs/VERCEL_COST_REDUCTION_PLAN.md`](VERCEL_COST_REDUCTION_PLAN.md) 맨 위.

## 쓰는 법 (모든 CLI 공통)

1. **미배포로 커밋할 때**: 아래 표에 한 줄 추가합니다(프로그램·무엇·커밋·날짜/CLI·상세 위치). 그 프로그램 `docs/IMPROVEMENTS.md`(또는 `AGENTS.md`)의 「미배포 대기」 기록은 지침대로 그대로 남깁니다 — 이 표는 그 기록들을 **한곳에서 찾게 해 주는 색인**입니다.
2. **그 프로그램을 배포할 때**: 배포 전에 이 표에서 그 프로그램 줄을 찾아 함께 나가는지 확인하고, 배포가 끝나면 줄을 지우고 맨 아래 「내보낸 기록」에 한 줄(배포 버전·날짜)을 남깁니다. 프로그램 폴더의 대기 표시도 지웁니다.
3. **공용 기준 코드 사본의 미배포**는 이 표에 다시 적지 않습니다 — [`docs/SHARED_MODULES.md`](SHARED_MODULES.md) 「미배포 사본」 표가 그 목록입니다. 프로그램을 배포할 때는 **두 표를 모두** 확인합니다.
4. 다른 CLI가 적은 줄은 지우거나 고치지 않습니다(배포해서 내보낸 경우만 지움 — 공동작업 규칙).

## 대기 중

| 프로그램 | 무엇(작은 소스 수정) | 커밋 | 날짜 · CLI | 상세 위치 | 다음 배포 때 |
|---|---|---|---|---|---|
| `banana-canvas` (운영 v1.31) | 다운로드 파일 이름 확장자(WebP → `.webp`, 기록 상세·작업 화면) · 다시 저장 이름표를 기록 제목에 | `a00e43925` · `b0502560e` | 2026-10-22 · Claude Code(윈도우, 이미지 연계 세션) | `banana-canvas/docs/IMPROVEMENTS.md` 맨 위 | 버전 v1.32, `resave-receiver` 사본도 함께(SHARED_MODULES) |
| `four-cut-comics` (운영 v1.34) | 「형식 바꾸기」 링크 `&label=` · 다시 저장 작품 제목 「○○ 3화 · WEBP」 · `resave-receiver` 기준 파일로 정리 | `b0502560e` | 2026-10-22 · Claude Code(윈도우, 이미지 연계 세션) | `four-cut-comics/docs/IMPROVEMENTS.md` 맨 위 | 버전 v1.35, 변환 스튜디오와 순서 상관없음 |
| `image-convert-studio` (운영 v1.24) | `?label=` 받아 다시 저장에 전달 · 「너무 큼」 옆 「품질 70%로 다시 변환」(PNG면 「WebP로 바꿔 다시 변환」) · 이미지 스튜디오에서 받기·다시 저장 | `b0502560e` | 2026-10-22 · Claude Code(윈도우, 이미지 연계 세션) | `image-convert-studio/docs/IMPROVEMENTS.md` 맨 위 | 버전 v1.25, 바나나 그림이 2.2MB 넘게 나오는 설정으로 크롬 확인 |
| `ai-image-studio` (운영 v1.27) | 갤러리 「🔁 형식 바꾸기」 · 새 API `/api/import-result`(변환 스튜디오에서 다시 저장 → 갤러리, `usage_logs` `image_import`) | 이번 묶음 커밋 | 2026-10-22 · Claude Code(윈도우, 이미지 연계 세션) | `ai-image-studio/docs/IMPROVEMENTS.md` 맨 위 | 버전 v1.28, **변환 스튜디오와 같은 날 배포**해야 이어짐 — 갤러리 → 형식 바꾸기 → 다시 저장 → 갤러리에 「변환 스튜디오에서 다시 저장」 크롬 확인 |
| `shorts-onestop-studio` (운영 v1.36) | 출처 띠 모서리 10px·`inline-flex`·「✕ 빼기」 오른쪽 끝 | `f055d6b70` | 2026-10-22 · Claude Code(윈도우) | `shorts-onestop-studio/docs/IMPROVEMENTS.md` 「처리(코드만, 미배포)」 | 버전 v1.37, 휴대폰 폭(375px)에서 긴 이름 띠 모양 확인 |
| `naver-blog-allinone` (운영 v1.50) | BC-05 보관함 30일 자동 삭제(`GET /api/cron/cleanup`, Vercel Cron) | `naver-blog-allinone/AGENTS.md` 맨 위 참고 | 2026-10-22 · Claude Code(윈도우·웨일 세션) | `naver-blog-allinone/AGENTS.md` 맨 위 「⏳ 미배포 대기」 | 그 항목의 확인 방법대로(이 줄은 색인만 — 원문은 해당 세션 기록) |

## 내보낸 기록

| 프로그램 | 배포 버전 · 날짜 | 함께 나간 대기 항목 |
|---|---|---|
| `thumbnail-master` | v1.19 · 2026-10-22 (`85aff6a76`) | 쇼츠 표지 안내 `de99b1ca9` |
