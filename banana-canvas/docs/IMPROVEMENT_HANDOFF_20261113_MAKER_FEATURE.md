# 메이커 P1·P2 기능 인수인계 — 상품 대표사진 합성 + 상세 상품 반환 (2026-11-13, 담당 A)

작성: [역할: ecommerce-image] Claude Code(윈도우) 세션 `claude-win-blog`(배정 세션 `claude-win-sdp` 대신 수행) · 받는 담당: B agy(디자인), C policy(저장 정책), F Codex(검수), 주인님.
플랜: [`PLAN_20261113_MAKER_PRODUCT_COMPOSITE.md`](PLAN_20261113_MAKER_PRODUCT_COMPOSITE.md) — 주인님 승인 추천안 5건(P1+P2 함께 / 새 칸 `main_image_url`+이력 / 11번가·스마트스토어 연결 / A 기능 먼저→agy 디자인 / 1000×1000 흰 배경).
커밋: `65f5b399a`(플랜) · `0abd5aabd`(구현 22파일) · `3c2c95d7e`(버전·로그인 정책·위젯). **2026-11-13 배포 완료**: 운영 DB 칸 2개 → 스마트스토어 v1.27 → 바나나 v1.46 → 상세 v1.44 → 11번가 v1.06(각 Ready·DB 버전).

## 1. 한 것

| 프로그램 | 내용 | 파일 |
|---|---|---|
| 바나나 `/batch` | 모드 전환 「🖼 사진 일괄 손질」(기존 그대로) / 「🛍 상품 대표사진 합성」(새). `?mode=product`면 합성으로 시작 | `src/components/batch/BatchModes.tsx`, `src/app/(workspace)/batch/page.tsx` |
| 〃 짝짓기 | 작업표(엑셀 붙여넣기 TSV·CSV, 머리줄 별칭 「상품코드·옵션·대표사진·서브1」, 없으면 코드·옵션·메인·서브 순서) 또는 파일 이름 `코드_main`·`코드_sub1`. 파일 순서로 짝짓지 않음. 메인 없음·없는 파일·중복 코드·메인 두 장·50개 초과·작업표에 없는 사진을 실행 전에 표시. 공용 서브 1장(모든 상품) | `src/lib/batch/productJobs.ts` |
| 〃 합성 | 1000/1200/800 정사각, 메인 안에 맞춤/꽉 채움, 여백, 서브 9곳 위치·15~50%(기본 32%)·여백·둥근 모서리·흰 외곽선·그림자, 서브 여러 장은 가로(위·아래 줄)/세로(가운데 줄)로 나란히. 설정 버전 해시 | `src/lib/batch/composite.ts`, `compositeRender.ts`(기존 `render.ts`의 `readBitmap`·`canvasToBlob` 재사용) |
| 〃 실행 | 한 개씩, 「전체 일괄 즉시 중단」은 지금 한 개를 마치고 멈춤, 성공분 유지, 「실패한 것만 다시」 | `src/lib/batch/runQueue.ts` |
| 〃 결과 | 이름 틀 `{prefix}_{code}_{option}_{role}`(빈 칸 생략·금지 문자 정리·같은 이름 (2)), ZIP + `결과표.csv`(BOM)·`결과표.json`(키·회원 정보 없음) | `productJobs.ts`, `components/batch/ProductCompositeBoard.tsx` |
| 공용 약속 | `product-photo-handoff`(기준 바나나, 사본 상세) — 주소 고정·`e.source===opener`·1회용 `jobId`·상품 50·사진 4(메인 맨 앞 1장)·사진 25MB·결과 10MB(PNG/JPG) | `src/lib/productPhotoHandoff.ts` ↔ `shop-detail-page/lib/productPhotoHandoff.ts` |
| 상세페이지 | 상품 목록 「🛍 대표사진 일괄 만들기」 패널: 상품 고르기·서브 0~3장(참고 사진 앞에서) → 바나나 창 → 결과를 상품마다 저장, 「원본으로」 | `components/products/MainPhotoBatch.tsx`, `app/(dashboard)/products/page.tsx` |
| 〃 저장 | 브라우저가 `<회원>/products/<상품>/main/<uuid>.jpg`로 직접 업로드 → `setMainPhotoAction`(본인 상품·그 상품 main 폴더 파일만, 보낸 뒤 상품 수정되면 거절·파일 삭제, 이력 10장 넘으면 오래된 파일 삭제) | `lib/mainPhotoClient.ts`, `lib/actions/mainPhoto.ts`, `lib/mainPhoto.ts` |
| 〃 DB | `shop_products.main_image_url text`, `main_image_urls text[] default '{}'`(칸 추가만) | `supabase/migrations/20261113_main_photo_v1_44.sql`, `types/database.types.ts` |
| 등록기 | 대표 이미지 = `main_image_url \|\| source_image_url` | `elevenst-register/src/lib/shop.ts`, `smartstore-register/src/lib/data.ts`·`api/extension/task/route.ts` |

원본 사진(`source_image_url`)·참고 사진·섹션 이미지는 건드리지 않는다. 목록 카드 그림은 합성 대표사진이 있으면 그것.

## 2. 입출력 계약(요약 — 상세는 플랜 §3)
- 상세 → 바나나 `aimaster-product-photos` `{jobId, products:[{productId, label, baseRevision(updated_at), photos:[{role, ref, file}]}]}`
- 바나나 → 상세 `aimaster-product-photos-result` `{jobId, productId, file, settingsVersion}` 상품마다 1통 → 상세가 저장 후 `aimaster-product-photos-saved` `{jobId, productId, ok, error}` → 바나나 표 「반환」 칸.
- 상세 저장은 한 개씩 차례로(같은 상품 이력 덮어쓰기 방지). 성공 뒤 그 상품의 기준 수정 시각을 새 값으로 바꿔 같은 작업 안 재저장도 받음.

## 3. 검수 증거
- 바나나 시험 `tests/batchProduct.test.mjs` 12개(F1 짝짓기·F2 순서 무관·F3 이름·F5 중단/실패만 다시·F6 결과표·배치 계산·약속 검사) + 전체 92개 통과, `tsc` 0, 로컬 `next build` 성공(`/batch`).
- 상세 시험 `tests/mainPhoto.test.mjs` 3개(F7 본인 폴더만·이력 10장·묵은 작업), `node --test tests/`(Node 22.18+ 형식 지우기), `tsc` 0, `next lint` 0, 로컬 build 성공.
- 11번가 시험 38개·스마트스토어 27개 통과, 두 곳 `tsc` 0.
- **미확인**: 실제 브라우저 두 창 주고받기·저장·등록기 미리채움(배포 뒤 시험 계정으로), 메모리(50상품×4장) 실측, 바나나 린트(설정 파일 없음).

## 4. 배포 순서(승인 뒤 — 순서 중요)
1. **운영 DB 먼저** `shop-detail-page/supabase/migrations/20261113_main_photo_v1_44.sql` — 등록기·상세가 `main_image_url`을 읽으므로 칸 없이 코드가 나가면 상품 조회가 실패한다.
2. 바나나 v1.46 → 상세페이지 v1.44 → 11번가 v1.06 → 스마트스토어 +0.01(한 번에 하나, Ready 확인 후 다음). 각 버전 파일·DB `programs.version` 함께.
3. 크롬(시험 계정): 상세 목록 → 상품 2개 고르기 → 바나나 창 → 일괄 만들기 → 상세 목록 카드가 합성 사진으로, 「원본으로」 복구 / 바나나 파일 모드 3상품 ZIP·결과표 / 11번가 등록 화면 대표 이미지.

## 5. 담당께
- **B agy(디자인)께**: 이제 `banana-canvas/src/components/batch/ProductCompositeBoard.tsx`·`BatchModes.tsx`·`shop-detail-page/components/products/MainPhotoBatch.tsx`를 디자인 담당이 이어서 고쳐도 됩니다(A는 이 3개를 더 고치지 않음 — 기능 수정이 필요하면 IMPROVEMENTS에 남김). 화면이 쓰는 상태: 작업 `status`(ready/invalid/running/done/failed/skipped)·`error`·`returned`(""·sending·saved·실패 문구), 집계 준비/고칠 것/완료/실패, 설정 `CompositeSettings`. agy 시안의 「서브 누락(🟠)」은 현재 오류가 아니라 서브 0장으로 진행(메인만) — 경고로 보여 줄지 결정 필요. 「상세페이지 상품 불러오기」는 바나나 쪽 버튼이 아니라 **상세페이지 목록에서 보내는 방식**으로 구현됨.
- **C policy께**: 저장 위치 `<회원>/products/<상품>/main/`(상품 30일 정리와 함께 삭제, `retention_exempt` 그대로), 상품당 최대 10장 이력. 상세페이지에 용량 사전검사가 없음(기존 직접 올리기도 동일) — 공용 용량 규칙 연결 필요 여부 판정 부탁. 「포스팅됨(markPosted)」 표시는 넣지 않음.
- **F Codex께**: 플랜 §6 F1~F10. F1~F3·F5·F6·F7(단위)은 시험으로 확인, F4·F7(실물)·F8·F9·F10은 배포 뒤.

## 6. 남은 것·특이사항
- 다른 기기 이어하기·서버 작업 기록은 하지 않음(브라우저 작업, 창을 닫으면 결과는 ZIP으로만).
- 같은 상품코드가 다른 옵션이면 별개 상품(`code+option`이 키). 코드 대소문자는 구분.
- 상세 연결 모드의 파일명 코드 = 상품 관리명(`product_label` 또는 `name`).
- 비용: AI 0, 빌드 0(로컬만). 배포 빌드 4회·DB 마이그레이션 1건은 승인 뒤.

## 7. 배포 뒤 실물 확인 (2026-11-13, ego lite, 시험 계정 `buylifemall@naver.com`)
- 상세 목록 v1.44 「🛍 대표사진 일괄 만들기」 → 「스위스톤 확장형 여행 백팩」 1개(서브 1장) → 바나나 새 창 `/batch?mode=product&from=shop-detail` 「상품 1개를 받았습니다」 → 일괄 만들기 → 「완료 · 반환 저장됨」 → 상세 목록 「합성 대표사진 · 저장됨」, 카드 그림 `…/main/<uuid>.jpg`.
- 11번가 v1.06 그 상품 화면 첫 이미지 = 합성 대표사진(F8 통과). 합성 사진 1000×1000 흰 바탕·서브 오른쪽 아래·외곽선·그림자 확인.
- 「원본으로」 → 합성 표시·main 사진 사라짐(복구). 시험 데이터 남지 않음.
- **발견(agy·A 후속)**: 이 상품의 참고 사진이 세로로 긴 상세 이미지라 서브가 가는 띠로 들어감 → 서브 「정사각으로 잘라 채우기」 선택지 필요(IMPROVEMENTS).
- 미확인: 파일 모드 ZIP·결과표 실물(F4), 중단·실패만 다시 실물(F5), 50상품 메모리, 스마트스토어 확장 실제 채우기, 휴대폰 폭.

## 8. v1.47 결함 수정·남은 실물 검수 (2026-11-13 저녁)
- **결함(v1.46)**: 파일 모드 「추가」·끌어놓기로 사진이 0장 들어감 — `addFiles`가 상태 갱신 함수 안에서 FileList를 읽는데 그 전에 입력 칸을 비워 목록이 비었음(상세 연결 모드는 정상이라 첫 실물 확인에서 놓침). `6b28e7849`로 수정, v1.47 운영 확인.
- **실물 통과(운영 v1.47, ego lite)**: F1 짝 없는 사진 표시 · F4 21상품(서브 있는 것 2·없는 것 18·깨진 1) · F5 중단(완료 2 유지)→이어 하기(20 완료·1 실패)→실패만 다시(1개만) · ZIP 22파일(1000×1000 JPG 20 + 결과표 2, 실패 사유 포함) · 390px 가로 넘침 없음.
- **보완**: 서브 정사각 채우기 기본(`subFit: "cover"`, `8377b66c7`, v1.47 포함) · 깨진 사진 실패 사유 한국어(「○○ 사진을 열 수 없습니다…」, `compositeRender.ts`, 미배포).
- **배포 주의**: agy가 `batch/` 화면을 미커밋으로 작업 중일 때는 작업 폴더째 배포하지 말 것 — `git archive HEAD banana-canvas | tar -x -C <임시>` + `.vercel` 복사 뒤 그 폴더에서 `npx vercel deploy --prod --yes --scope buylife`.
- **agy 담당께**: 새 화면이 `readBitmap`을 `compositeRender`에서 가져오므로 한국어 오류가 그대로 적용됩니다. 「서브 맞춤(정사각/원본 비율)」 버튼(`update({ subFit })`)만 넣어 주세요. 실패 줄에 사유가 보이도록 `error` 표시 유지 부탁드립니다.
- 남은 것: 스마트스토어 확장 실제 채우기, 50상품×4장 메모리 실측, P3·P4 사전검토.
