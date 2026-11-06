# V3 — 상품 홍보 쇼츠 모드 + 상세페이지 → 쇼츠 받는 화면 (2026-11-06)

- 담당: [역할: video] Claude Code(윈도우) `claude-win-video`
- 근거: `docs/analysis-ecommerce-bundle-20261024/HANDOFF_20261024_VIDEO.md` §2 V3 · 주인님 2026-11-06 「순서대로 진행해」
- 참고: `product-shorts-studio`의 15초 6비트 **구성만**(라이선스 없음 — 코드·문구 사용 안 함), prohubstart 설명 화면의 CTA 아이디어

## 1. 1단계 범위(이번)
| 넣은 것 | 위치 |
|---|---|
| 구성 「상품 홍보(15초 6비트)」 — 인트로(결과 먼저)·카드 4(쓰기 전·상품 등장·쓰는 모습·달라진 결과)·아웃트로(처음으로 이어지는 마무리+구매 안내) | `src/lib/script.ts` `FORMATS.product` |
| 상품 정보 칸: 상품명·장점 3개·혜택(선택) — 적은 것만 사실로 씀 | `src/components/views/TopicView.tsx` |
| 허위·과장 막는 규칙(없는 효능·가격·판매량·「품절 대란」·최상급·의학 단정·비방 금지) | `src/lib/prompts.ts` `PRODUCT_RULES` |
| 목표 길이 15초(상품 홍보일 때 15·30초), 카드 4장 고정, 15초는 장면당 글자 한도 10자 | `prompts.ts` `narrationBudget`, `api/ai/script` |
| 다른 프로그램이 넘기는 값 받기(주소 `#` 뒤, 로그인을 거쳐도 보관) | `src/lib/productShorts.ts`, `src/lib/refHandoff.ts`, `LoginForm.tsx` |
| 시험 6개 | `tests/productShorts.test.ts` |

## 2. 넘기기 형식(이커머스 담당과 맞출 값)
```
https://shorts-onestop-studio.buylife.xyz/topic#product-name=<상품명>&product-point=<장점>&product-point=…&product-offer=<혜택>&product-from=<보낸 프로그램>
```
- 모두 `encodeURIComponent`. 상품명 100자 · 장점 최대 3개 각 60자 · 혜택 80자 · 보낸 프로그램 40자에서 자름.
- 보내는 쪽은 `productHandoffHash()`(같은 파일)를 사본으로 쓰거나 같은 규칙으로 만들면 된다.
- **넘기지 않는 것**: 도매가·원가·재고·주문·고객 정보(`trending-product-finder/lib/shopDetailLink.ts`와 같은 원칙).
- 주소 `#` 뒤라 서버 기록에 남지 않는다(레퍼런스 대사 넘기기 v1.32와 같은 방식).

## 3. 2단계(다음 — 이번에 안 함)
- 상품 사진을 배경으로: `Bg.source`에 「상품 사진」 추가 + 렌더러·불러오기 확장 + 넘기기 값 `product-image`(https만). 이커머스 쪽 사진 주소가 공개 주소인지(캔버스 CORS) 확인 필요.
- 제품 외형 일치 점검(AI 장면이 실제 상품과 다르면 경고).
- 보내는 쪽 버튼(`shop-detail-page` 「쇼츠로 만들기」)은 이커머스 담당(ecommerce-image) 몫.

## 4. 검수
- 자동: 시험 39개(새 6개 포함) · `tsc` · `npm run build` 통과.
- 미확인: 실제 AI 대본 생성(시험 계정 본인 키 1회, 몇 원 — 비용 사전 승인 규칙상 승인 뒤), 화면 확인(배포 뒤).

## 5. 비용·배포
- 회원 비용: 기존 대본 생성과 같음(회원 본인 키 1~2회).
- 배포: **미배포 대기**, 배포 때 v1.44. 처음 설정 0단계 · 매일 조작 2번(구성 고르기·대본 만들기, 넘겨받으면 1번).
