# 메이커 P2 — 상품 「대표사진」 칸과 바나나 합성 반환 (2026-11-13, [역할: ecommerce-image] Claude Code 윈도우 `claude-win-blog`)

전체 인수인계: [`banana-canvas/docs/IMPROVEMENT_HANDOFF_20261113_MAKER_FEATURE.md`](../../banana-canvas/docs/IMPROVEMENT_HANDOFF_20261113_MAKER_FEATURE.md) · 플랜: [`banana-canvas/docs/PLAN_20261113_MAKER_PRODUCT_COMPOSITE.md`](../../banana-canvas/docs/PLAN_20261113_MAKER_PRODUCT_COMPOSITE.md)

- **미배포 대기**(커밋 `0abd5aabd`): 상품 목록 「🛍 대표사진 일괄 만들기」(`components/products/MainPhotoBatch.tsx`), 대표사진 기록 `lib/actions/mainPhoto.ts`(본인 상품·그 상품 `main/` 폴더만·묵은 작업 거절·이력 10장), 업로드 `lib/mainPhotoClient.ts`, 규칙 `lib/mainPhoto.ts`(시험 `tests/mainPhoto.test.mjs`, `node --test tests/`), 공용 사본 `lib/productPhotoHandoff.ts`(기준 바나나 — 직접 고치지 말 것), 목록 카드 그림 = 합성 대표사진 우선.
- **DB**: `supabase/migrations/20261113_main_photo_v1_44.sql`(`main_image_url`, `main_image_urls`) — **코드 배포 전에 먼저 적용**(11번가·스마트스토어 등록기도 이 칸을 읽음).
- 원본 `source_image_url`은 AI 분석 입력이라 그대로 둔다. 30일 정리는 상품 폴더째 지우므로 고칠 필요 없음.
- **2026-11-13 배포 완료**: v1.44(`shop-detail-page-agt903lj2`), 운영 DB 칸 적용·실물 확인(반환 저장·11번가 첫 이미지·원본 복구).
