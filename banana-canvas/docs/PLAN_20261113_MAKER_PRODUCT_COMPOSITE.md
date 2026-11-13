# 플랜 — 바나나 「상품 대표사진 일괄 합성」(P1) + 상세상품 반환(P2)

2026-11-13 · 담당 A(기능·상품 연계) · 작성 Claude Code(윈도우) · **상태: 플랜·결정 대기(구현 안 함)**
근거: [`HANDOFF_20261113_MAKER_CLAUDE_FEATURE.md`](../../docs/analysis-ecommerce-bundle-20261024/HANDOFF_20261113_MAKER_CLAUDE_FEATURE.md), [`MAKER_UPDATE_REVIEW_20261113.md`](../../docs/analysis-ecommerce-bundle-20261024/MAKER_UPDATE_REVIEW_20261113.md) P1·P2. 대상 버전: 바나나 v1.45, 상세 v1.43, 11번가 v1.05, 스마트스토어(코드 기준) — 2026-11-13 로컬 코드 대조.

## 1. 지금 코드 사실 (2026-11-13 대조)

| 항목 | 현재 | 근거 |
|---|---|---|
| 바나나 `/batch` | 사진 1장 → 결과 1장(높이 맞춤·테두리·문자/로고 워터마크·EXIF 제거). 최대 50장·25MB·4096px, ZIP(`jszip`), 설정은 브라우저 저장 | `src/lib/batch/layout.ts`, `render.ts`, `components/batch/BatchPhotoBoard.tsx` |
| 여러 사진 → 한 장 합성 | 없음(로고 하나를 모든 사진에 얹는 것만) | 같은 파일 |
| 다른 프로그램과 사진 주고받기 | 누끼 약속: 창 사이 `postMessage`, 주소 고정 검사, **섹션 1장씩**, 결과 10MB 한도 | 공용 `nukkiHandoff.ts`(사본 4곳), `nukkiReceive.ts` |
| 상세 상품의 사진 칸 | `shop_products.source_image_url`(원본 1장, AI 분석 입력), `reference_image_urls`(참고 사진), 섹션 이미지는 `shop_product_images`(섹션별 `image_urls` 이력 + 활성 `image_url`) | `0001_multitenancy.sql`, `0004`, `lib/actions/images.ts` |
| **대표사진 칸** | **없음**. 11번가·스마트스토어 등록기가 `source_image_url`을 대표사진, `reference_image_urls` 앞 9장을 추가 사진으로 씀 | `elevenst-register/src/lib/shop.ts:78-79`, `smartstore-register/src/lib/data.ts` |
| 외부 상품코드 | 상세 상품에 없음. 회원 관리명 `product_label`만 있음 | `0006_product_label.sql` |

→ P2 「원래 상품의 대표사진 칸으로 반환」은 **반환받을 칸이 없어서** 칸을 정하는 결정이 먼저다(아래 결정 2).

## 2. 범위

**하는 것(1차)**
- P1 바나나 `/batch`에 두 번째 모드 「🛍 상품 대표사진 합성」 추가(기존 「사진 일괄 손질」은 그대로).
  - 입력 두 가지: (가) 내 PC 사진 + 상품코드 표(CSV 또는 파일 이름 규칙) (나) 상세페이지에서 고른 상품들(P2 연결).
  - 상품마다 main 1장 + sub 0~3장 → 한 장으로 합성. 서브는 「공용 서브 1장」 또는 「상품별 서브」.
  - 규칙 하나(크기·여백·서브 위치/비율·테두리·배경·꽉 채움/안에 맞춤)를 정하고 첫 상품 미리보기 → 일괄 실행.
  - 결과: 상품별 1장, 파일명 `코드[_옵션]_main.jpg`, 결과표 CSV+JSON, ZIP.
- P2 상세페이지 상품 목록에서 「대표사진 일괄 만들기」 → 바나나로 상품·사진 전달 → 결과를 **각 상품의 대표사진 칸에 새 버전으로 저장**(원본 사진은 덮어쓰지 않음).

**하지 않는 것(별도 플랜)**: P3 외부 URL·공급사 사진 받기, P4 E2, 유료 AI 합성·배경 생성, 마켓 자동 등록, 서버 작업 재개(다른 기기 이어하기), 1000장 이상 대량.

## 3. 입출력 계약

### 3-1. 상품 작업 한 줄(바나나 안, 저장 안 함)

```ts
type PhotoRole = "main" | "sub";
interface ProductJob {
  key: string;              // 작업 안 고유값: 상세 연결이면 productId, 파일 모드면 code+option
  productId: string | null; // 상세 상품 id(uuid). 파일 모드는 null
  code: string;             // 외부 코드(파일 모드) 또는 product_label/name(상세 모드) — 파일명용, 안전 문자로 정리
  option: string | null;
  label: string;            // 화면 표시용 이름
  photos: { role: PhotoRole; source: "file" | "shop-detail"; ref: string; file: Blob }[]; // ref = 원래 파일명 또는 원본 URL 경로
  baseRevision: string | null; // 상세 모드: 보낼 때의 shop_products.updated_at (묵은 작업 감지)
  status: "ready" | "invalid" | "running" | "done" | "failed" | "skipped";
  error: string | null;
  result: { name: string; blob: Blob; w: number; h: number } | null;
}
```
- 비밀키·이메일·회원정보는 넣지 않는다. 결과표(CSV/JSON)에는 `code, option, label, productId, main, subs, result, status, error, settingsVersion, createdAt`만.

### 3-2. 파일 모드 짝짓기 규칙
- 상품코드 표(CSV: `code,option,main,sub1,sub2,sub3`) 또는 파일 이름 규칙 `코드_main.jpg`, `코드_sub1.jpg`.
- 파일 순서로 자동 짝짓지 않는다. 실행 전 표시: main 없음·같은 코드 중복·표에 없는 파일·없는 파일을 가리키는 표 줄.
- 공용 서브: 서브 1장을 「모든 상품에」로 지정하면 상품별 sub는 무시(화면에 표시).

### 3-3. 상세 ↔ 바나나 메시지(새 약속 `productPhotoHandoff`, 누끼 약속과 같은 방식)
| 방향 | 메시지 | 내용 |
|---|---|---|
| 바나나 → 상세 | `aimaster-product-photos-ready` | 준비됨 |
| 상세 → 바나나 | `aimaster-product-photos` | `{ jobId(1회용 uuid), products:[{ productId, label, baseRevision, photos:[{role, ref, file}] }] }` — 최대 50상품, 사진당 25MB |
| 바나나 → 상세 | `aimaster-product-photos-result` | `{ jobId, productId, file(≤10MB), settingsVersion }` 상품마다 1통 |
| 상세 → 바나나 | `aimaster-product-photos-saved` | `{ jobId, productId, ok, error }` (바나나 결과표 상태 갱신) |

- 주소 고정(보낸 곳 `shop-detail-page.buylife.xyz` ↔ 받는 곳 `banana-canvas.buylife.xyz`), `e.source === window.opener` 검사, 다른 `jobId` 무시 — 누끼 약속 검사 그대로.
- 상세가 보내는 사진: 상품의 `source_image_url`=main, `reference_image_urls`=sub 후보(회원이 상세 화면에서 고름). 상세 창에서 같은 브라우저로 내려받아 Blob으로 보냄(서버 경유 없음).

### 3-4. 상세의 저장(서버 액션, 결정 2의 추천안 기준)
`saveMainPhotoAction(productId, file, baseRevision)`:
1. `requireProgramAccess()` → 그 상품이 **본인 것인지**(`user_id`) 확인, 없으면 거절(삭제된 상품).
2. `updated_at !== baseRevision`이면 「작업 중 상품이 바뀌었습니다」로 거절(덮어쓰지 않음, 회원이 다시 보냄).
3. 저장공간 사전검사(공용 용량 규칙) → 저장소 `shop-detail-images/<userId>/<productId>/main-<시각>.jpg` 업로드.
4. `main_image_url` = 새 주소, `main_image_urls`에 이력 추가(최대 10, 넘으면 가장 오래된 것 파일까지 정리). `source_image_url`·`reference_image_urls`는 건드리지 않음.

## 4. 수정 파일과 담당(동시 수정 금지)

| 파일 | 담당 | 비고 |
|---|---|---|
| `banana-canvas/src/lib/batch/productJobs.ts`(새) | **A** | CSV/파일명 짝짓기·검사·안전 파일명·결과표 CSV/JSON — 순수 함수 |
| `banana-canvas/src/lib/batch/composite.ts`(새) | **A** | main+sub 배치 계산(프리셋·여백·서브 위치/비율·cover/contain) — 순수 함수 |
| `banana-canvas/src/lib/batch/compositeRender.ts`(새) | **A** | 그리기. 기존 `render.ts`의 `readBitmap`·`canvasToBlob` 재사용 |
| `banana-canvas/src/lib/batch/runQueue.ts`(새) | **A** | 한 장씩 순서 처리·중단(`AbortController`)·실패만 다시 |
| `banana-canvas/src/lib/productPhotoHandoff.ts`(새, 기준) + `shop-detail-page/lib/productPhotoHandoff.ts`(사본) | **A** | 공용 기준 코드로 등록(`SHARED_MODULES.md`·`check-shared-modules`) |
| `banana-canvas/tests/batch-product-*.test.mjs`(새) | **A** | 짝짓기·이름·배치·메시지 검사 시험 |
| `banana-canvas/src/components/batch/ProductCompositeBoard.tsx`(새) | **A가 기능 화면 먼저 → B가 디자인 적용** | 시간으로 나눔: A가 기능 완성·인계 커밋 후 B 착수. A는 기존 클래스만 사용 |
| `banana-canvas/src/app/(workspace)/batch/page.tsx` | A(모드 전환 2줄) → 이후 B | |
| `banana-canvas/src/components/batch/BatchPhotoBoard.tsx`, `layout.ts`, `render.ts` | **수정 안 함** | 기존 기능 보존(재사용만) |
| `shop-detail-page/supabase/migrations/<새>_main_photo.sql` | A(결정 2 승인 시) | 컬럼 2개 추가 |
| `shop-detail-page/lib/actions/mainPhoto.ts`(새), 상품 목록 「대표사진 일괄 만들기」 버튼·대표사진 표시 | A | 화면 모양은 B 시안 반영 |
| `shop-detail-page/app/api/cron/cleanup-generated/route.ts` | A(C 검토 후) | 새 이력 파일도 30일·`retention_exempt` 규칙 적용 |
| `elevenst-register/src/lib/shop.ts`, `smartstore-register/src/lib/data.ts`·`api/extension/task/route.ts` | A(결정 3 승인 시) | 대표사진 = `main_image_url ?? source_image_url` 한 줄씩 |
| 디자인 시안·쇼케이스 아카이브 | **B(agy)** | A는 건드리지 않음 |
| 저장·보관·용량 판정 | **C(policy)** 검토 | A는 C 결과대로 구현 |

## 5. 오류·취소·충돌 정책
- 실행 전 검사에서 걸린 상품은 `invalid`로 표시하고 실행 대상에서 뺀다(회원이 고치거나 뺌).
- 한 장씩 순서대로 처리. 「중단」은 지금 그리는 한 장을 마친 뒤 멈춤, 성공 결과는 남김. 「실패한 것만 다시」.
- 유료 호출이 없어 결과 불확실 상태는 없다(모두 브라우저 계산). 그래도 같은 `jobId`·`productId` 저장 성공 응답을 받은 상품은 다시 보내지 않는다.
- 상세 창이 닫힘·10MB 초과·저장 거절 → 그 상품만 실패 표시, ZIP으로 내려받아 직접 올리는 안내.
- 묵은 작업(상품 수정·삭제)·다른 회원 상품 → 서버에서 거절, 덮어쓰기 없음.
- 메모리: 비트맵은 한 장 그린 뒤 바로 `close()`, 미리보기는 축소본. 50상품×사진 4장 기준으로 실측 후 한도 조정(300 이상은 약속하지 않음).

## 6. 검수 기준(F 검수표 — Codex)
| 번호 | 확인 | 방법 |
|---|---|---|
| F1 | 짝짓기: main 없음·중복 코드·고아 파일·표 줄 오류가 실행 전에 보인다 | 시험 + 화면 |
| F2 | 파일 순서를 바꿔도 같은 결과(순서로 짝짓지 않음) | 시험 |
| F3 | 파일명 안전 문자·같은 이름 (2)(3) 처리·옵션 포함 | 시험 |
| F4 | 공용 서브/상품별 서브 각각 결과 N장 | 화면(로컬 사진 3상품) |
| F5 | 중단 → 성공분 유지, 실패만 다시 | 화면 |
| F6 | 결과표 CSV/JSON에 키·회원정보 없음 | 시험 |
| F7 | 상세 반환: 본인 상품만, 원본 칸 불변, 대표사진 이력 추가, 묵은 작업 거절 | 시험 + 시험 계정 실물 |
| F8 | 등록기 미리채움이 새 대표사진을 쓴다(결정 3 승인 시) | 11번가 화면 |
| F9 | 기존 「사진 일괄 손질」 회귀 없음 | 기존 시험 + 화면 |
| F10 | 0번 규칙 고지·저장 위젯·로그인 정책 유지 | `pending-check` |

## 7. 비용·버전·배포
- AI 호출 0, 서버 이미지 처리 0. 저장은 회원 저장공간(대표사진 1장/상품)만.
- 빌드: 바나나 v1.46 · 상세 v1.44 · (결정 3) 11번가 v1.06 · 스마트스토어 +0.01 → **최대 4회, 순차**. 배포 직전 따로 승인받는다.
- 운영 DB: 상세 마이그레이션 1건(결정 2) — 적용 전 승인.

## 8. 결정 항목(주인님)
1. **1차 범위**: P1(파일 모드)만 먼저 / **P1+P2 함께(추천)**.
2. **대표사진 저장 칸**: **새 칸 `main_image_url`+이력 `main_image_urls` 추가(추천, 원본 보존)** / 원본 사진 칸 `source_image_url`을 덮어씀(마이그레이션 없음, 원본·AI 분석 입력이 바뀜) / 섹션 이미지 표에 특별 섹션으로 저장(등록기가 섹션 이미지로 오인할 위험).
3. **등록기 연결**: **이번에 11번가·스마트스토어가 새 대표사진을 우선 쓰게 함(추천, 빌드 +2)** / 이번엔 상세까지만, 등록기는 다음 배포 때.
4. **화면 작업 순서**: **A가 기능 화면 먼저 → agy가 디자인 적용(추천)** / agy 시안 확정 후 A 구현.
5. 기본 출력 프리셋: 1000×1000 흰 배경(추천, 마켓 허용 보증 아님) / 다른 값.

## 9. 다음 첫 단계(승인 후)
`docs/ACTIVE_WORK.md`에 바나나·상세 줄 등록 → 순수 함수 2개 + 시험(F1~F3·F6) → 그리기·대기열 → 기능 화면 → 메시지 약속 → 상세 저장(마이그레이션 승인 후) → 등록기 한 줄 → 인계(B·C·Codex) → 배포 승인 요청.
