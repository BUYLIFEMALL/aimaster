# shop-detail-page 인수인계 — 2026-10-21 (이커머스 병합 E0 · v1.15)

> 작성: Claude Code(맥미니, 보조 계정). 대상 ① 운영 AIMaster, DB ref `esgxyikcnnvmlhygjkth`. 상세 변경: `AGENTS.md` v1.15. 병합 전체 계획: `../docs/analysis-ecommerce-consolidation-20261021/REPORT.md`.

## 상태
- 코드 완료·tsc 0·커밋(맥미니). **배포·마이그레이션·환경변수 확인·화면 검수는 윈도우 CLI 차례.**
- 다음 묶음 E1(12단 → 15p)은 E0 배포·검수가 끝난 뒤 맥미니가 이어서 구현.

## 윈도우 CLI 다음 첫 단계 (이 순서 그대로 — 순서가 바뀌면 이미지가 잠깐 깨짐)
1. `cd shop-detail-page && npm run build` (로컬 확인).
2. Vercel 환경변수 `CRON_SECRET`이 `shop-detail-page` 프로젝트 Production에 있는지 확인(`vercel env ls`). 없으면 주인님께 알리고 추가(값은 다른 프로그램과 같은 방식). 없어도 정리 작업만 401로 멈추고 앱은 동작함.
3. `vercel deploy --prod --yes` → Ready 확인(`vercel inspect`). **새 코드는 버킷이 공개여도 정상 동작**하므로 배포를 먼저 한다.
4. 배포 Ready 뒤 마이그레이션 `supabase/migrations/20261021_private_bucket_v1_15.sql` 적용(MCP `apply_migration` 또는 SQL). 확인: `select public from storage.buckets where id='shop-detail-images';` → false.
5. DB 버전: `update programs set version='v1.15', updated_at=now() where slug='shop-detail-page';`
6. 크롬 검수(시험 계정 `buylifemall@naver.com`, 비용 0 — 생성 버튼 누르지 않음):
   - 상품 목록 썸네일, 상품 상세의 섹션 이미지·버전 썸네일·확대 보기가 보이는지(`/api/image` → 서명 주소).
   - 「긴 이미지 내려받기」(AI 호출 없음)로 PNG가 받아지는지.
   - 목록 상단 30일·유예 안내 문구, 왼쪽 위 v1.15.
   - 옛 공개 주소(`…/object/public/shop-detail-images/…`)를 로그인 없이 열면 거부되는지.
7. 정리 작업 수동 호출 1회: `curl -H "Authorization: Bearer $CRON_SECRET" https://shop-detail-page.buylife.xyz/api/cron/cleanup-generated` → 2026-11-21 전에는 `{"skipped":"grace",…}`가 정상.
8. 결과를 이 문서 아래 「배포 결과」와 루트 `docs/HANDOFF.md`에 기록.

## 되돌리기
- 이미지가 안 보이는 문제가 생기면 마이그레이션 파일 맨 아래의 되돌리기 SQL로 버킷을 공개로 돌리면 즉시 복구(코드는 공개 버킷에서도 동작).

## 남은 일 / 주의
- D-48-01 중 「같은 섹션 동시 생성 시 이력 덮어쓰기」는 남음(읽기 직후 upsert라 창이 짧음). 필요하면 DB 함수로 원자적 추가(스키마 변경 승인 필요).
- 2026-11-21 이후 첫 실행에서 9월 자료(상품 4·파일 약 103)가 지워진다 — 정상.

## 배포 결과
(윈도우 CLI가 기록)
