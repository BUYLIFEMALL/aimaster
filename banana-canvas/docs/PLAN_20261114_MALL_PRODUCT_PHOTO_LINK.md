# 메이커 연계 M1 — 쇼핑몰 → 바나나 「🛍 상품 대표사진 합성」 → 쇼핑몰 (2026-11-14)

작성: [역할: ecommerce-image] Claude Code(윈도우) `claude-win-sdp` · 주인님 「메이커 연계(바나나로 상품 사진 손질) … 진행해」
근거: 쇼핑몰 검토 [`mall-builder/docs/IMPROVEMENT_HANDOFF_20261113_MAKER.md`](../../mall-builder/docs/IMPROVEMENT_HANDOFF_20261113_MAKER.md) §2·§5·§7, 바나나 P1·P2 [`IMPROVEMENT_HANDOFF_20261113_MAKER_FEATURE.md`](IMPROVEMENT_HANDOFF_20261113_MAKER_FEATURE.md)

## 1. 막혀 있던 것 → 지금
| 막힌 이유(11-13) | 지금(11-14) |
|---|---|
| 바나나 P1 승인 | ✅ 바나나 v1.46·v1.47 운영 배포, 실물 검수 끝(상세 반환·파일 모드·50상품) |
| 몰 사진 보관 기준(policy) | ✅ 11-14 결정 — 안 쓰는 사진만 30일, 관리자·시험 몰 제외(`mall-builder` 0066) |

## 2. 결정 — 새 약속을 만들지 않고 기존 `product-photo-handoff`에 보낸 곳만 추가
쇼핑몰 검토서는 `nukki-handoff`에 「여러 장」 메시지를 새로 만드는 안을 적었으나, 그 뒤 P2로 **상품 여러 개·메인/서브·상품마다 반환·저장 결과 알림**을 다 갖춘 `product-photo-handoff`가 생겼다. 그래서 이것을 그대로 쓴다.

| 쇼핑몰 검토서 §2 칸 | 약속에서 | 누가 들고 있나 |
|---|---|---|
| 몰 `store_id`·`slug`, 공급사 `supplier_id`, 작업 기준 시각 | `jobId` 하나로 묶어 **쇼핑몰 창이 자기 메모리에 보관**(바나나로 보내지 않음) | 쇼핑몰 |
| 내부 상품 ID `product_id` | `productId`(uuid) | 양쪽 |
| 외부 코드 `product_code` | `label`(파일 이름·화면 표시) | 양쪽 |
| 작업 기준 시각 `updated_at` | `baseRevision` | 양쪽(반환 때 쇼핑몰이 비교) |
| 사진 역할 main = `images[0]`, sub = `images[1..3]` | `photos[{role, ref(경로), file}]`, 메인 맨 앞 1장·최대 4장 | 쇼핑몰이 담음 |
| 결과 | 상품마다 `aimaster-product-photos-result {jobId, productId, file(JPG/PNG ≤10MB), settingsVersion}` | 바나나 → 쇼핑몰 |
| 저장 결과 | `aimaster-product-photos-saved {jobId, productId, ok, error}` | 쇼핑몰 → 바나나(표 「반환」 칸) |

몰·공급사·분양몰 거울·묵은 작업 검사(검토서 §3)와 「제안 → 적용」(§4)은 **모두 쇼핑몰 쪽**에서 한다. 바나나는 쇼핑몰 저장소에 직접 올리지 않는다.

## 3. 바나나 쪽 — 한 것(미배포 대기)
- `src/lib/productPhotoHandoff.ts`(공용 기준): `PRODUCT_MALL_ORIGIN = https://mall-builder.buylife.xyz`, 보낸 곳 표 `PRODUCT_SENDERS{shop-detail, mall}`, `productBatchUrl(from)`, `productSenderOrigin(from)`. `readProductJob`·`readProductSaved`에 받을 주소 `expectedOrigin`(기본 상세페이지 — **지금 화면 코드는 그대로 동작**).
- 시험 1개 추가(창마다 한 곳만, `__proto__`·`toString` 같은 이름 거절, Lab 주소 거절) — 전체 97개 통과, `tsc` 0(바나나·상세).
- 상세페이지 사본 동기화(동작 같음 — 저장소만, 다음 상세 배포 때 함께).

## 4. 바나나 쪽 — 남은 것: 화면 연결(agy 디자인 담당께)
지금 상품 합성 화면은 `from=shop-detail`일 때만 작업을 받고 결과를 상세 주소로만 보낸다. 쇼핑몰도 받으려면 화면에서 세 곳만 바꾼다(지금 쓰는 `ProductCompositeBoard.tsx` 기준 줄, 새 `ProductBatchBoard.tsx`에도 같은 원리):

```ts
const senderOrigin = productSenderOrigin(q.get("from"));   // 116줄: from !== "shop-detail" 대신
if (!senderOrigin || !window.opener) return;
readProductJob(e.origin, e.data, senderOrigin); readProductSaved(e.origin, e.data, jobId, senderOrigin);
window.opener.postMessage({ type: PRODUCT_MSG_READY }, senderOrigin);              // 139줄
window.opener.postMessage({ type: PRODUCT_MSG_RESULT, jobId, productId, file, settingsVersion }, senderOrigin); // 180줄
```
- 안내 문구의 「상세페이지」는 보낸 곳 이름으로(쇼핑몰이면 「쇼핑몰」).
- **⚠️ 새 `ProductBatchBoard.tsx`(미커밋) 결함 2건**: 결과 메시지를 `kind:`로 만들고 있음 → 받는 쪽은 `type:`만 읽어 결과가 버려짐. 그리고 `postMessage(msg, PRODUCT_RECEIVER_ORIGIN)`은 바나나 **자기 주소**라 상세·쇼핑몰 창에 전달되지 않음 → 위처럼 `senderOrigin`으로. 필드도 `{type, jobId, productId, file, settingsVersion}` 그대로 써야 한다.

## 5. 쇼핑몰 쪽 — M1~M3(쇼핑몰 담당께)
- 사본 받기: `docs/SHARED_MODULES.md` `product-photo-handoff` 줄 사본 칸에 `mall-builder/src/lib/productPhotoHandoff.ts`를 넣고 `node scripts/check-shared-modules.mjs --module product-photo-handoff --sync`(직접 고치지 않음).
- 여는 주소: `productBatchUrl("mall")` → `…/batch?mode=product&from=mall`. 「준비됨」(`isProductReady`)을 받은 뒤 작업 1통.
- 보내기 기준 예: 상세페이지 `shop-detail-page/components/products/MainPhotoBatch.tsx`(창 열기·준비됨 기다리기·결과 받기·한 개씩 저장·저장 결과 알림·기준 시각 갱신)가 같은 약속의 실제 사용 예다.
- 결과 받기: `readProductResult(origin, data, jobId, 보낸 상품 id 집합)` → 몰 폴더 `<몰 id>/…`(공급사는 `<몰 id>/supplier/<공급사 id>/…`)에 올리고 **사진 제안**으로 저장(검토서 §4) → `PRODUCT_MSG_SAVED`로 알림.
- 서브 사진: 바나나는 메인 위에 서브를 얹은 **합성 대표사진 1장**을 돌려준다(서브를 따로 손질해 돌려주지 않음). 쇼핑몰은 이것을 `images[0]` 제안으로 쓰면 된다.

## 6. 순서·배포·비용
1. (끝) 바나나 약속 코드 — 미배포 대기.
2. agy: 화면 연결 3곳 + 결함 2건 → 바나나 배포 때 함께(빌드 1회, 다른 미배포분과 묶음).
3. 쇼핑몰: M1 보내기 → M2 제안 표(운영 DB 1개, 승인 필요) → M3 적용·되돌리기 → 쇼핑몰 배포(빌드 1회).
4. 둘 다 나간 뒤 운영 실물: 쇼핑몰 상품 2개 → 바나나 → 반환 → 제안 → 적용 → 손님 화면 대표사진.
- 비용: 지금까지 없음(로컬 시험만). AI 호출 없음(합성은 브라우저 그림 그리기).
