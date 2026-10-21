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

---

# E1 · v1.16 (12단 → 15p) — 윈도우 CLI 다음 첫 단계

> E0(v1.15) 배포·검수를 끝낸 뒤 진행. 순서 중요: **마이그레이션이 배포보다 먼저**(v1.16 코드가 `layout_preset` 칸을 읽음 — 없으면 상품 화면 섹션이 비어 보임). 마이그레이션은 기본값이 있는 칸 추가 + 행 추가라 v1.15 코드에는 영향 없음.

1. 마이그레이션 `supabase/migrations/20261021_layout_presets_v1_16.sql` 적용 → 확인: `select layout_preset, count(*) from shop_prompt_templates where user_id is null group by 1;` → shop15 15 · coupang12 12 · smartstore9 9.
2. `cd shop-detail-page && npm run build && vercel deploy --prod --yes` → Ready.
3. `cd detail-page-12p && npm run build && vercel deploy --prod --yes` → Ready(이동 안내 화면 v1.10).
4. SQL `docs/analysis-ecommerce-consolidation-20261021/E1_grant_and_hide_12p.sql` 0→1→2→3→4 순서(권한 연장 4명, 12단 `is_active=false`, 두 앱 DB 버전).
5. 크롬 검수(시험 계정, **AI 생성 버튼 누르지 않음 — 비용 0**):
   - 15p 새 상품 화면: 6번 규격 3개 카드·「📄 사양서 불러오기」 버튼, TXT 파일 선택 시 원본 정보 칸에 내용이 들어가는지.
   - 15p 목록: 「📦 12단 자료 가져오기」 → `/products/import` 화면.
   - 12단 `https://detail-12p.buylife.xyz`: 이동 안내 화면·백업 버튼(자료 없으면 안내 문구)·「상세페이지 자동화 열기」 링크.
   - 12단 생성 API가 410: `curl -s -X POST https://detail-12p.buylife.xyz/api/generate-detail` (로그인 없이도 410).
   - 휴대폰 폭(390px)에서 규격 카드가 1열로.
6. 실제 생성 확인이 필요하면(쿠팡 12단 섹션 1장) **비용을 주인님께 먼저 알린 뒤** 가장 저렴한 이미지 모델로 1장만.

## 배포 결과
(윈도우 CLI가 기록)
