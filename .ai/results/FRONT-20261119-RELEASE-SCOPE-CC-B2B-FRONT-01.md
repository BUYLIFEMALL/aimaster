# B2B몰 프런트 배포 후보 사전 대조

- 담당 CC-B2B-FRONT-01 · SubPC `codex-sub-20261119-mall-design` · 2026-11-19 KST
- Master 배정 `msg_46d9e2cb9bb4`. 비교 스냅샷 `aa42dd1a5`. 운영 v1.16 제품 기준 `1aea8ec0f`(버전 기록 `5c229f968`), Lab 제품 기준 `7609748ad`. 배포 상태는 인수 및 Master 기록 기준입니다.
- 검증은 Git의 커밋 경로와 파일 내용 해시를 읽어 수행했습니다. 후보 적용, 재시험, 서비스 접속은 수행하지 않았습니다.

## 후보와 경로

경로는 `mall-builder/` 기준입니다. 표의 커밋은 적용 순서입니다.

| 후보 | 커밋 | 제품 경로 | 시험 경로 |
| --- | --- | --- | --- |
| 머리글 카테고리 탭 올림 대비 | `77c50f27c` | `src/app/globals.css`, `src/lib/theme.ts` | `tests/dark-header.test.mjs`, `tests/theme.test.mjs` |
| 디자인 갤러리 44px 색상 단추 | `90248e5b1` | `src/app/s/[store]/admin/design/templates/template-gallery.tsx` | `tests/gallery-keyboard.test.mjs` |
| 상품 원래 가격 대비 | `86e5ad1bf` | `src/app/s/[store]/(shop)/product-card.tsx`, `src/app/s/[store]/(shop)/p/[id]/product-detail.tsx` | `tests/dark-header.test.mjs` |
| 홈 상품 탭 | `489c888e6` → `9f6b1c131` | `src/app/s/[store]/home-blocks.tsx` | `tests/home-tabs.test.mjs` |
| 휴대폰 빠른 메뉴 | `794c5fd01` → `1766fe92e` → `c8a134486` → `51d4b2207` | `src/app/s/[store]/(shop)/quick-bar.tsx`, `src/app/s/[store]/(shop)/shop-frame.tsx`, `src/app/s/[store]/admin/design/design-editor.tsx` | `tests/quick-bar-narrow.test.mjs` |

## 기준판별 선행 변경과 같은 파일

- **Lab `7609748ad` 기준** — 위 9개 커밋의 14개 경로에서 변경 직전 해시 불일치 0, 마지막 해시와 `aa42dd1a5` 불일치 0이었습니다. 갤러리 키보드 선행 `7c8ee3a81` → `e4ba29947`는 이미 포함돼 있습니다. `dark-header.test.mjs`는 `77c50f27c`와 `86e5ad1bf`가 차례로 바꾸므로 두 변경을 보존해야 합니다. 빠른 메뉴 최종안과 편집기 보완은 `shop-frame.tsx`를 공유합니다.
- **운영 `1aea8ec0f` 기준** — 같은 파일의 기존 Lab 검수 내용을 포함하려면 선행 순서 `e13f8785b` → `13049d0bd` → `59e7e7843` → `7c8ee3a81` → `e4ba29947` → `acb858a77` → `f7120d185` → `5b02c3399` → `7609748ad`가 필요합니다. 이어서 위 9개를 대조한 결과 18개 커밋의 19개 경로에서 변경 직전 해시 불일치 0, 마지막 해시 불일치 0이었습니다. 이 선행 집합은 소스 정합성 확인 결과이며 실제 반영 범위와 순서는 Master가 결정합니다.
- `e13f8785b`는 `home-blocks.tsx`의 전체 폭 넘침과 `tests/block-frame-full.test.mjs`를 포함합니다. 기존 0101 배포 준비 범위와 겹치는 경우 한 번만 포함합니다. `13049d0bd`는 갤러리 도식과 함께 `src/lib/builder/templates.ts`, `templates-extra-4.ts` 및 두 템플릿 시험을 바꿉니다. 운영 후보에서 갤러리 파일을 가져올 때 등록표와 신규 템플릿도 함께 확인합니다.
- 빠른 메뉴의 기존 렌더 연결 `(shop)/layout.tsx`는 양 기준판에 들어 있습니다. 기존 E5 시험 `tests/quick-bar.test.mjs`는 후보 경로에서 제외합니다. Lab 이후 고정 스냅샷까지 위 14개 경로의 Git 이력에는 표의 커밋 외 변경이 없었습니다. 대상 19개 경로의 작업 트리 상태에는 수정 표시가 없었습니다. Lab 전체 소스에는 백엔드 0101~0104 관련 앱 코드도 섞여 있으므로 프런트 범위를 선택할 때 이 표의 경로와 커밋 변경분을 기준으로 삼습니다.

## 별도 배포와 남은 검수

- **S70** `50d3e6162` → `ee35d6eb1`. 제품 경로는 `src/app/s/[store]/(shop)/order/` 아래 `actions.ts`, `cash-receipt-checkout.ts`, `order-form.tsx`, `page.tsx`입니다. 시험은 `tests/cash-receipt-checkout.test.mjs`입니다. 백엔드 `supabase/migrations/0105_cash_receipt_checkout.sql`과 같은 배포 묶음입니다. Master 작업표상 Mac 재검수 기존 6/6 및 별도 결제수단 3/3을 수락했고 Lab 실검증은 대기입니다.
- **휴대폰 빠른 메뉴** 고정 `51d4b2207`은 28/28 및 Master 수락 `4de6db0af`. 실제 편집기 화면 확인은 기존 맥미니 과제에 연결합니다.
- **홈 상품 탭** 고정 `9f6b1c131`은 Mac 독립 모의 4/4 수락. Lab 다크 실화면과 VoiceOver가 남았습니다. 기존 검수 근거는 `.ai/master-status.json`과 QUICKBAR 독립 결과 문서에 있습니다.
- 기존 요청 `6ef94bb2`는 `open`이며 휴대폰 실기기 터치·버튼 색과 가독성 확인을 기다립니다. `c640c509`도 `open`이며 운영 배포 뒤 첫 화면·머리글·버튼 색 확인에 해당합니다. 두 항목은 이전 세션에서 등록했습니다. 이번에는 읽기로 상태만 확인했습니다.

제품 수정·공용 스테이징·Lab 접속·서버·빌드·배포·푸시·요청함 변경 없음.

비용: 없습니다
