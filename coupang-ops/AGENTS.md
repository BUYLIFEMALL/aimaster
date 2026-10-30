# AI 쿠팡 운영 자동화 (`coupang-ops`) — 에이전트 인수인계

> 루트 `../CLAUDE.md`(메인 지침)를 함께 읽는다. 한국어 진행 안내·회원 본인 계정/키·비용 사전 승인·경로 지정 커밋 규칙이 그대로 적용된다.
> 플랜: [`docs/PLAN_20261028_COUPANG_OPS.md`](docs/PLAN_20261028_COUPANG_OPS.md)(API 103개 목록 §10, 고정 IP 비용 §11·§12, 확정 §13·§14, 제한·제재 §15) · 기능 대기 목록: [`docs/IMPROVEMENT_BACKLOG.md`](docs/IMPROVEMENT_BACKLOG.md)
> **📘 최신 인수인계(2026-10-29, 가장 먼저 읽기)**: [`docs/IMPROVEMENT_HANDOFF_20261029.md`](docs/IMPROVEMENT_HANDOFF_20261029.md) — 판매 재개·상품 등록 화면·짧은 이미지 주소·반품비 규칙·남은 일(등록 실행 → 최종 배포).
> 이전 인수인계(2026-10-28): [`docs/IMPROVEMENT_HANDOFF_20261028.md`](docs/IMPROVEMENT_HANDOFF_20261028.md) — 판매정지로 쿠팡 API가 막혀 멈춘 상태·운영 DB 적용 내용·코드 지도·함정·다음 첫 단계.
> **📘 쿠팡 API 공식 사이트 먼저(2026-10-30 주인님 지시: 「여기 쿠팡 api전용 싸이트가 있으니 자세히 읽어보고 기능 구현하도록 해」「앞으로도 여기 관련 내용 확인하고 구현하도록 해」)**: 쿠팡 기능을 만들거나 고치기 전에 **https://developers.coupang.com/ko/api?market=KR** 목록에서 해당 API의 상세 페이지(`/ko/api/<묶음>/<이름>?market=KR`)를 읽고 경로·메서드·요청 본문·응답 필드·적용 상태·오류를 코드와 대조한 뒤 구현한다. 코드 주석에 상세 페이지 이름과 확인 날짜를 남긴다. 기억이나 다른 프로그램 코드로 추측하지 않는다.
>   - 10-30 기존 작업 검토 결과: 코드가 부르는 경로 12개·메서드가 공식 목록과 모두 일치. 옵션 재고(`amountInStock`·`salePrice`·`onSale`)·가격 변경(`forceSalePriceUpdate` 기본 false 유지)·상태변경이력(`status`·`comment`·`createdBy`·`createdAt`)·카테고리 추천(`productName`, `autoCategorizationPredictionResultType`·`predictedCategoryId`) 응답 필드도 명세와 같음 — 고칠 곳 없음. 남은 확인: 송장 수정 본문 형식(명세 표의 타입 표기 차이, AGENTS 10-30 C3-3 항목).
>   - 기능 확장 기획: [`docs/PLAN_20261030_COUPANG_API_AUTOMATION.md`](docs/PLAN_20261030_COUPANG_API_AUTOMATION.md)(관점 6가지·추천 순서·하지 않을 것).
> 담당 역할: `ecommerce-image`(Claude Code 윈도우 `claude-win-sdp`). 마켓 등록기 공통 레퍼런스: [`../docs/MARKETPLACE_REGISTER_ANALYSIS_GUIDE.md`](../docs/MARKETPLACE_REGISTER_ANALYSIS_GUIDE.md).

## 1. 사용 목적·대상
쿠팡에 상품을 올리고 운영하는 판매자가 **쿠팡 공식 WING Open API(판매자 본인 키, 연동 방식 「자체개발」)**로 상품 등록부터 가격·재고·주문·송장·반품·문의까지 한 화면에서 처리한다. 첫 모듈은 상품 등록(AI 상세페이지 자동화 `shop-detail-page` 상품을 그대로 사용).

## 2. 기술·도구
Next.js 16(App Router, `src/proxy.ts`) · React 19 · Tailwind 4 · Supabase 공용 DB(ref `esgxyikcnnvmlhygjkth`). 뼈대는 `smartstore-register` 복사(권한·로그인·사이드바·`slw-*` 스타일, 강조색만 쿠팡 빨강 `#be123c`). 쿠팡 호출은 **우리 서버 + Fixie 고정 IP 프록시**(`FIXIE_URL`, IP `52.87.82.133`·`52.5.155.132`) — C1-3에서 `undici` `ProxyAgent`로 구현 예정(`threads-affiliate-poster` 토스 연동과 같은 방식). 확장 없음.

## 3. 구조
| 부분 | 파일 | 하는 일 |
|---|---|---|
| 권한 | `src/lib/access.ts`·`src/lib/programAccess.ts` | 로그인 + 이용 권한(`THIS_PROGRAM_SLUG = "coupang-ops"`) |
| 메뉴·출시 순서 | `src/lib/tools.ts` | `TOOLS`(출시한 화면만, 지금 비어 있음)·`ROADMAP`(대시보드 「기능 출시 순서」) |
| 화면 | `/home`·`/guide` | 대시보드·키 발급 매뉴얼(자체개발·허용 IP 복사 상자) |
| 쿠팡 키(C1-2) | `/connect`·`src/lib/coupang/keys.ts`·`src/lib/actions/connection.ts`·`src/lib/data.ts` | 공용 표 `user_api_keys`에 키 이름 4개(`coupang_wing_vendor_id`·`_access_key`·`_secret_key`·`_user_id`, 파트너스 키와 다름) 저장·삭제, 화면엔 끝 4자리만. 원문은 서버 `getWingKeys()`만 |
| DB | `supabase/migrations/20261028_coupang_ops_v1_01.sql` | 프로그램 등록(비공개)·요금제·VIP·테스트 계정 14일 |
| 쿠팡 호출(C1-3) | `src/lib/coupang/client.ts`(`wingRequest`)·`sign.ts`·`tests/client.test.mjs` | HMAC 「CEA」 서명(경로와 조건 사이 `?` 없음 — 파트너스 실계정 확인 규칙), `FIXIE_URL` 있으면 고정 IP 프록시·없으면 개발 PC 직접(운영에선 막음), 429는 GET만 1회 재시도, 생성·수정은 재시도 없음, `X-CAG-Warnings` 반환. `npm test` |
| 상품·본문(C1-6·C1-12) | `src/lib/shop.ts`·`src/lib/coupang/product.ts`·`docs/API_PRODUCT_CREATE_SPEC.md`·`tests/product.test.mjs` | 상세페이지 상품 읽기(본인 폴더 이미지만), 쿠팡 생성 본문 `buildCreateBody`·검사 `checkDraft`(옵션명 중복·정가<판매가·재고·반품비 100~150%·이미지 https 200자) |
| 물류·연결 시험(C1-4·C1-5) | `src/lib/coupang/logistics.ts`·`src/lib/actions/wing.ts`·`src/components/ConnectionTest.tsx`·`tests/logistics.test.mjs` | 출고지·반품지 조회와 응답 정리, `/connect` 「연결 시험」(읽기만) |
| 카테고리(C1-7·C1-8) | `src/lib/coupang/category.ts`·`tests/category.test.mjs` | 추천(POST categorization/predict)·메타(구매/검색옵션·고시·서류·인증) 정리, 고시 채우기, 필수 안내. ⚠️ 메타의 고를 수 있는 값 목록 유무는 실응답 확인 필요 |
| 기본값(C1-5) | `/defaults`·`src/components/DefaultsForm.tsx`·`src/lib/coupang/defaults.ts`·`tests/defaults.test.mjs` | 출고지·반품지(쿠팡에서 불러오기)·택배사·배송비·반품비 저장(`coupang_ops_defaults`) |
| DB(C1-2) | `supabase/migrations/20261028_coupang_wing_keys_c1_2.sql` | 키 이름 제약에 4개 덧붙이기(운영 DB 현재 목록을 읽어 추가 — 다른 이름 보존) + `integration_catalog` 「쿠팡 WING Open API」 |

## 4. 버전·이력
- v1.01 (2026-10-28, **미배포 · 운영 DB 적용됨(비공개)**): C1-1 웹 뼈대 — 대시보드(출시 순서)·매뉴얼. tsc·로컬 build 통과. 같은 날 C1-2 키 등록 화면 추가(검사 함수 가짜 값 확인, DB SQL 미적용).

## 5. 남은 일
1. **배포는 모았다가(2026-10-28 주인님 「모았다가 하자」)**: C1-2~C1-14는 로컬(`npm run dev`, 이 PC IP `210.178.96.91`이 WING 허용 IP에 있음)에서 만들고 시험 → 1단계 완성 때 Vercel 새 프로젝트·도메인·환경변수(Supabase 4개·`FIXIE_URL`)·빌드 1회(그때 승인). 운영 DB 등록 SQL은 로컬 시험 시작 때 C1-2 키 목록 변경과 함께 적용(그때 승인).
2. C1-2 키 등록(공용 키 표 「쿠팡 WING Open API」, DB 변경 승인) → C1-3 호출 컴포넌트 → C1-4 연결 시험.
3. 주인님 쿠팡 계정: 10-29 판매 재개 → 키 재발급 → 「자체개발」 + IP 등록(플레이오토 연동은 안 씀, 끊겨도 됨).

## 6. 연계
상세페이지 자동화(상품) → 이 프로그램(쿠팡) / 스마트스토어 등록기(스마트스토어)로 같은 상품을 두 마켓에. 주문·송장은 `shop-order-report`와 연계 예정(C3-3).

## 7. 디자인
「쿠팡 운영 워크벤치 스타일」 — `smartstore-register` 「스토어 등록 워크벤치 스타일」 구조에 강조색만 쿠팡 빨강(`--accent: #be123c`, Tailwind `rose`). 디자인 다듬기는 디자인 담당에게.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## 2026-10-28 저녁 — 운영 DB 적용·실키 시험(판매정지로 멈춤)
- 운영 DB에 SQL 3개 적용(프로그램 비공개 등록·키 이름 4개·표 3개), 관리자는 공개 전에도 사용(`programAccess.ts`), 주인님 실제 키 저장·WING 「자체개발」 IP 3개 반영 확인.
- 쿠팡 응답: 「IP 불허」 → 반영 뒤 「계정 상태 변경으로 API 제한」(판매정지) — 서명·키·IP는 통과. 판매 재개 뒤 이어서.
- 상세: [`docs/IMPROVEMENT_HANDOFF_20261028.md`](docs/IMPROVEMENT_HANDOFF_20261028.md).

## 2026-10-29 — 판매 재개 확인·실응답 확인(로컬, 미배포)
- `/connect` 「연결 시험」 성공: 출고지 9곳·반품지 4곳(사용 중: 출고지 「바이라이프 #4181476」, 반품지 「바이라이프 #1000521297 · CJ대한통운」). 판매정지 풀림, 저장된 키 그대로 동작(재발급은 권장).
- `/connect` 「4. 카테고리 확인」 추가(`checkCategoryAction`·`components/CategoryCheck.tsx`, 읽기만): 「남성 노트북 백팩 15.6인치 방수」 → **남성백팩 #69579**, 단일 상품 불가, 속성 27개(필수: 색상·패션의류/잡화 사이즈 — 구매옵션), 고시 상품군 3개(가방·어린이제품·기타 재화), 구비서류 5·인증 27.
- **메타 속성 응답 칸 확인**: `attributeTypeName, dataType, inputType, inputValues, basicUnit, usableUnits, required, groupNumber, exposed` → **고를 수 있는 값 목록(`inputValues`)과 입력 방식(`inputType`)이 온다.** `normalizeMeta`에 아직 두 칸을 담지 않음 → 상품 화면 만들 때 추가.
- `/defaults`: 출고지·반품지는 골랐으나 **반품배송비(초도·편도) 금액을 주인님이 정해 주셔야 저장**(아직 저장 안 함).
- 상품 노출은 아직 안 되는 상태(주인님 확인 중) — 실제 등록 시험은 노출이 풀린 뒤.
- **반품배송비 규칙(2026-10-29 주인님 지시)**: 회원이 직접 정할 수 있고, 비우면 **편도 = 발송비 + 1,000원**(초도·반품 두 칸 모두) → 무료배송 상품 반품 왕복 = (발송비+1,000원)×2. 무료배송이어도 반품비는 받는다(판매자가 택배비를 마진에 넣어 대신 낸 것) → 두 칸이 0이면 저장 막음. `/defaults`에 「발송비(택배 1건 실제 비용)」 칸 추가(`shipCost`, 쿠팡에 보내지 않음), `defaults.ts` `defaultReturnFee`·`checkDefaults`. 시험 23개 통과.
- +1,000원의 뜻: 반품 회수 때 드는 **박스·포장 비용**(주인님 설명) — 화면 안내·코드 주석에 표기.
- 배송비 방식: 쿠팡 API는 무료·유료·착불·조건부 무료 4가지뿐(수량별·구간별은 스마트스토어 전용, 주인님 확인). 발송비 기본 4,000원 → 반품비 편도 5,000원·무료배송 반품 왕복 10,000원. `/defaults` 실제 저장 완료(출고지 4181476·반품지 1000521297·초도/반품 5,000원).
- 제주·도서산간 추가배송비는 **출고지 설정(WING)의 택배사별 값**(`remoteInfos`) — 연결 시험 결과에 표시. 지금 「바이라이프 #4181476」은 제주 0원·도서산간 0원.
- 작은 개선 대기: 기본값 화면 새로고침 시 출고지가 이름 없이 번호로만 보임(이름도 저장).

## 2026-10-29 — 상품 등록 화면(C1-6~C1-10, 로컬·미배포)
- 메뉴 「📦 상품 등록」: `/products`(상세페이지 상품 목록, 검토 완료 먼저) → `/products/[id]`(`components/ProductForm.tsx`): 상품명·브랜드·제조사 → 「쿠팡 카테고리 추천받기」 또는 번호 직접 → 구매옵션 값(쉼표, 쿠팡 목록 자동완성) → 「옵션 표 만들기」(조합, 최대 200줄, 정가·판매가·재고 100 기본) → 검색 속성(SELECT는 쿠팡 목록 선택) · 고시 상품군 · 검색 태그 → 「검사하기」.
- 서버 액션 `lib/actions/product.ts`: `loadCategoryAction`(추천+메타, 읽기만), `checkProductDraftAction`(쿠팡에 보내지 않음 — `checkDraft` + 메타 경고, 이미지는 짧은 주소 자리표시로 길이 검사).
- `category.ts`: 속성에 `inputType`·`values`(inputValues 글자 목록) — 실응답 `inputType: "SELECT"`, `inputValues: ["가을","겨울","봄",…]` 확인.
- 실제 시험: 「스위스톤 확장형 여행백팩(ST4D18)」 → 쿠팡 추천 「남녀공용백팩 #69885」(단일 상품 불가, 필수 색상·사이즈) → 블랙/FREE 1줄 → **검사 통과**. 시험 23개 통과.
- 다음: 짧은 이미지 주소 `/i/<id>`(C1-11) → 등록 실행 「저장만」·기록(C1-13·C1-14) — 실제 보내기는 상품 노출 풀린 뒤 1건.
- **C1-11 짧은 이미지 주소(2026-10-29)**: `lib/imageLinks.ts` `createImageLinks(userId, paths)`(본인 폴더만, 16바이트 무작위 id, 30일 만료, 표 `coupang_ops_image_links`, 서버 키) · `app/i/[id]/route.ts`(로그인 없이 쿠팡이 받아 감 — 만료·남의 경로·형식 오류는 404, 캐시 1일) · `proxy.ts` matcher에서 `i/` 제외(로그인 리다이렉트 안 받게). 확인: `npm run build` 통과, `next start`에서 `/i/abc`·없는 id 404, `/products` 307. ⚠ 개발 서버(`npm run dev`)에서는 메모리 부족으로 컴파일 작업자가 죽어 `/i/`만 500 — 코드 문제 아님.
- ⚠ **쿠팡은 공개 주소의 이미지만 받아 간다** → 실제 등록(「저장만」 시험)은 **배포 뒤**에만 가능(로컬 주소는 쿠팡이 못 엶). 그래서 C1-13 등록 실행은 로컬에서 코드·검사까지, 실제 1건은 최종 배포 직후.
- **제주·도서산간 추가배송비 API 수정 불가(2026-10-29 실측)**: `/defaults` 「🏝 WING 출고지에 저장」(`updateRemoteFeeAction`, `components/RemoteFeeForm.tsx`, PUT `/v2/providers/openapi/apis/api/v5/vendors/{vendorId}/outboundShippingCenters/{code}`)을 만들었으나, 출고지 조회 응답의 `remoteInfos[].remoteInfoId`가 **null** → 명세상 수정에 필수라 보내지 않고 멈춤(쿠팡 설정 안 바뀜). 번호 없이 보내면 같은 택배사 중복 거절 가능성 → 실계정 시험 안 함. 지금은 **WING에서 직접** 바꾸고 「연결 시험」으로 확인. 단건 조회 API(`query-one`)가 번호를 주는지는 미확인(다음 확인 후보).
- **C1-13·C1-14 등록 실행·기록(2026-10-29, 로컬 확인)**: `ProductForm` 「5. 쿠팡에 저장만 보내기」(검사 통과 + 확인 체크 뒤에만 켜짐) → `sendProductAction`(product.ts): **배포 서버(`VERCEL=1`)에서만 보냄**(로컬은 쿠팡이 이미지를 못 받아 안내 후 멈춤 — 크롬 확인) · 같은 상품 실패가 아닌 기록 있으면 막음 · 카테고리 메타로 고시 채움 · `createImageLinks`로 대표·추가·상세 짧은 주소 · `checkDraft` 재검사 · `coupang_ops_jobs`에 `sending` 먼저 기록(서버 키) → POST `/v2/providers/seller_api/apis/api/v1/marketplace/seller-products`(재시도 없음) → `saved`(상품번호)·4xx `failed`·그 밖 `unknown`. 기록 목록 `listJobsAction`(본인·이 상품 최근 10건).
- `imageLinks.ts`의 `node:crypto` 불러오기가 개발 서버 작업자를 죽였음(「Jest worker … exceptions」) → `crypto.getRandomValues` + `Buffer`로 바꾸고 **개발 서버 재시작 후 해결**(`/i/abc` 404, 상품 화면 정상).

## 2026-10-30 — 작은 개선·승인 상태·내 상품·옵션 관리(로컬, 미배포)
- 주인님 결정: **기존 WING 키 계속 사용(재발급 안 함)** · 제주·도서산간 추가배송비는 **실제 상품 올릴 때 WING에서 입력** · **상품 등록은 기능만 구현하고 실제 「저장만」 검수는 쿠팡 상품 등록이 풀린 뒤**.
- 작은 개선: 기본값에 출고지 이름 저장(`outboundShippingPlaceName`, 표시용·쿠팡에 안 보냄 — 새로고침 뒤 이름 표시) · `/connect` 카테고리 확인의 원본 예시(`rawSample`·`rawAttrKeys`) 삭제 · 백로그 체크 표시 실제와 맞춤. 로컬 `npm run build` 통과.
- **C1-14 승인 상태 확인**: `lib/coupang/status.ts`(상품 조회 `data.statusName` + 상태변경이력 `/histories` `data[].comment` = 반려 사유, 상태 7가지 → 기록 상태) · `refreshJobStatusAction` · 상품 화면 기록마다 「쿠팡 상태 확인」(읽기만). 실제 확인은 등록 기록이 생긴 뒤.
- **C2-1 내 쿠팡 상품** `/my-products`(메뉴 🗂): 상품 목록 페이징 조회(`vendorId` 필수, 50개씩·「더 보기」 `nextToken`, 상태·상품명 20자 필터) — **실제 확인: 첫 쪽 50개(2024년 등록 식품, 모두 승인완료)**.
- **C2-2~C2-4 옵션 관리**(목록의 「옵션 관리」 → `components/ItemsPanel.tsx`, `lib/actions/items.ts`, `lib/coupang/items.ts`): 옵션별 현재값 `GET vendor-items/{id}/inventories`(재고·판매가·판매 중) · 가격 `PUT …/prices/{가격}`(10원 단위, 현재가 −50%~+100%, `forceSalePriceUpdate` 안 씀) · 재고 `PUT …/quantities/{n}`(0~99,999) · 판매 `PUT …/sales/stop|resume`. 서버가 보내기 직전 **쿠팡에서 현재값을 다시 읽어 검사**(화면 값 안 믿음), 화면은 「네, 쿠팡에 적용」 확인 한 번 더, 쓰기 재시도 없음. **실제 읽기 확인**: 「진미 진미춘장(5Kg)」 옵션ID 89322515520 · 27,070원 · 재고 9,999 · 판매 중지(판매정지 기간 영향으로 보임). 경로의 옵션ID = `vendorItemId`로 동작 확인. **쓰기(가격·재고·판매 재개)는 실제 상품이 바뀌므로 주인님 승인 뒤 1건만 시험 — 아직 안 함.**
- 시험 32개 통과(상태 3·목록 2·옵션 4 추가).

## 2026-10-30 (이어서) — C3-1 발주서 조회(로컬, 미배포)
- `lib/coupang/orders.ts`(경로 `/v2/providers/openapi/apis/api/v5/vendors/{vendorId}/ordersheets`, 일단위 페이징 — 명세 developers.coupang.com/ko/api/shipments/po-list-query-paging-by-day): 날짜는 `yyyy-mm-dd%2B09:00` 그대로 서명(URLSearchParams로 만들면 콜론까지 바뀌므로 직접 조립), 기간 최대 31일(시작·종료일 포함), 한 쪽 최대 50건, status 필수(결제완료·상품준비중·배송지시·배송중·배송완료·업체 직접 배송). 가격은 `{units}` 객체(숫자도 읽음). 발주 가능 수량 = shippingCount − (holdCountForCancel + cancelCount).
- 개인정보: 주문자·수취인은 화면에만 보이고 저장하지 않는다. 실전화번호(`ordererNumber`/`receiverNumber`)는 읽지 않고 안심번호만 보여 준다(시험으로 확인).
- `lib/actions/orders.ts` `listOrderSheetsAction`(본인 키, 읽기만) · `components/OrderSheets.tsx` · `/orders` · 메뉴 「🚚 주문(발주서)」.
- 실제 확인(크롬): 결제완료 최근 7일, 배송완료 9-30~10-30 모두 쿠팡이 오류 없이 빈 목록을 돌려줌(판매정지 기간 영향으로 주문 없음). 날짜 형식이 틀리면 서버 검사가 먼저 막는 것도 확인. **실제 주문 데이터로 화면 모양 확인은 주문이 생긴 뒤.**
- 남은 일: 서버 쪽 조회 간격 제한(Fixie 사용량 보호, 배포 전) → C3-2 상품준비중 처리(실제 주문 상태가 바뀌므로 1건 시험 때 승인).
- 시험 35개 통과(발주서 3개 추가), tsc 오류 0.
- 10-30 조회 간격 제한(Fixie 사용량 보호): `lib/readGap.ts` `takeReadSlot`(공용 `usage_logs`에 action `coupang_orders_read` 기록 → 마지막 기록이 10초 안이면 「N초 뒤에 다시」, 기록을 못 읽으면 막지 않음, 주문 내용은 안 남김, 새 표 없음) · 계산 `lib/readGapRule.ts`(`ORDER_READ_GAP_SECONDS` 10). 발주서 **첫 쪽만** 적용, 「더 보기」는 막지 않음. 크롬 확인: 연속 클릭 → 「조금 전에 불러왔습니다. 6초 뒤에…」, 10초 뒤 정상 조회. 시험 36개 통과·tsc 0. 다른 쿠팡 조회(내 상품·옵션)에도 필요하면 같은 함수에 action만 바꿔 쓴다.
- 10-30 **C3-2 상품준비중 처리**(코드 완료, 실제 시험 전): `PATCH /v2/providers/openapi/apis/api/v4/vendors/{vendorId}/ordersheets/acknowledgement` body `{ vendorId, shipmentBoxIds }`(최대 50, 명세 developers.coupang.com/ko/api/shipments/changing-the-status-to-product-in-preparation). `orders.ts` `ackIds`(중복·0 제거, 50건 제한)·`normalizeAckResult`(건별 `succeed`/`resultMessage`/`retryRequired`, 응답에 없는 번호는 실패로 표시) · `acknowledgeOrdersAction`(쓰기 재시도 없음, 5xx·연결 오류는 「이미 처리됐을 수 있으니 상품준비중으로 다시 불러와 확인」 안내 — 명세상 504·521은 처리됐을 수 있음). 화면: **결제완료로 불러온 목록일 때만** 선택 칸·「모두 고르기」·「선택한 N건 상품준비중으로」 → 「네, 쿠팡에 적용」 확인 → 성공 건은 목록에서 빼고 실패 건만 사유 표시, 처리 뒤 배송지가 바뀌었을 수 있으니 다시 조회하라고 안내. 시험 37개·tsc 0. **실제 1건 시험은 결제완료 주문이 생긴 뒤 주인님 승인**(지금은 결제완료 주문 없음).
- 10-30 **C3-3 송장 등록·수정**(코드 완료, 실제 시험 전): 등록 `POST …/v4/vendors/{vendorId}/orders/invoices`(상품준비중만, 성공 시 배송지시) · 수정 `POST …/orders/updateInvoices`(배송지시·배송중·배송완료·업체직송만). 명세 developers.coupang.com/ko/api/shipments/uploading-waybills · updating-waybills. `orders.ts` `invoicePath`·`cleanInvoice`(공백·하이픈 제거, CJGLS·DIRECT 숫자만, 그 밖 영문·숫자 6~30자)·`invoiceBody`(묶음 안 옵션마다 한 줄 — 빠지면 쿠팡 NOT_FOUND_VENDOR_ITEM, `splitShipping`·`preSplitShipped` false, `estimatedShippingDate` "", 50건 제한, 문제는 배송번호별 안내)·`parseInvoicePaste`(엑셀 「주문번호 또는 배송번호 + 송장번호」, 탭·쉼표·공백, 머리글 줄 건너뜀). `normalizeAckResult`에 성공 문구 인자 추가(상품준비중·송장 공용). `submitInvoicesAction(mode, entries)` 쓰기 재시도 없음, 5xx·연결 오류는 「이미 처리됐을 수 있으니 다시 조회해 확인」. 화면: 상품준비중으로 불러오면 「등록」, 배송지시 이후 상태로 불러오면 「수정」 — 주문마다 택배사(기본값 `deliveryCompanyCode`)·송장 입력, 「📋 엑셀에서 한 번에 붙여넣기」, 「네, 쿠팡에 적용」 확인(잘못된 송장 배송비는 판매자 부담 안내), 등록 성공 건은 목록에서 빼고 수정 성공 건은 새 송장 표시.
  - **확인 필요(첫 실제 시험 때)**: 수정 명세 표에는 `invoiceNumber`가 integer, `splitShipping`·`preSplitShipped`가 string으로 적혀 있으나 등록과 같은 형식(문자열 송장·불리언)으로 보낸다(송장 앞자리 0 보존). 쿠팡이 거절하면 수정 본문만 맞춘다.
  - `shop-order-report` 연계: 그 프로그램에는 송장 화면·송장 파일 형식이 없어(AGENTS 확인) 엑셀 두 칸 붙여넣기로 대신했다. 송장 파일 양식이 생기면 그 형식을 `parseInvoicePaste`에 맞춘다.
  - 크롬: 상품준비중 조회 정상(주문 0건이라 입력칸은 아직 화면에서 못 봄). 시험 38개·tsc 0.
- 10-30 **C3-4 주문 취소·출고중지**(코드 완료, 쓰기 시험 전) — 명세는 공식 사이트에서 읽음: 반품·취소 요청 목록 `GET …/v6/vendors/{vendorId}/returnRequests`(일단위 `yyyy-MM-dd`, 31일, `status` RU·UC, 취소 주문은 `cancelType=CANCEL`·status 없음) · 단건 `…/returnRequests/{receiptId}`(data 배열) · 출고중지완료 `PATCH …/v4/…/returnRequests/{receiptId}/stoppedShipment` `{vendorId, receiptId, cancelCount}` · 이미출고 `PATCH …/completedShipment` `{vendorId, receiptId, deliveryCompanyCode, invoiceNumber}`(둘 다 RELEASE_STOP_UNCHECKED·RETURNS_UNCHECKED + releaseStatus N일 때만, 응답 `data.resultCode`) · 주문 상품 취소 `POST …/v5/…/orders/{orderId}/cancel` `{orderId, vendorItemIds[], receiptCounts[], bigCancelCode CANERR, middleCancelCode CCTTER|CCPNER|CCPRER, vendorId, userId(WING 아이디)}`(결제완료 = 즉시 취소, 상품준비중 = 출고중지, 판매자 점수 하락).
  - 코드: `lib/coupang/returns.ts`(경로·조회 조건·정리·`actionable`·취소 본문·응답 필드 두 이름 모두 읽기 `receiptMap`/`ReceiptMap`, `failedVendorItemIds`/`failedItemIds` — 명세 표와 예시가 다름) · `lib/actions/returns.ts`(목록 + 조회 간격 제한, 출고중지완료·이미출고는 **처리 직전 단건 조회로 조건 재확인** 후 `cancelCount` = 쿠팡 접수 수량, 취소, 쓰기 재시도 없음) · `lib/coupang/returnGuard.ts` `unresolvedStopOrders`(server-only — 「use server」 파일에 두면 키를 받는 함수가 공개되므로 분리) · `components/ReturnRequests.tsx`·`/returns`·메뉴 「↩ 출고중지·취소」 · `OrderSheets` 「주문 취소…」.
  - **송장 등록 전 안전 점검(플랜 A3)**: `submitInvoicesAction` upload에서 최근 31일 RU·UC(각 최대 5쪽) 미처리 주문번호가 있으면 그 주문 때문에 전체를 멈추고 주문번호 안내. 확인 조회가 실패해도 멈춤(안전 우선). 등록 1회에 쿠팡 읽기 2회 이상 추가.
  - 신청인 이름·전화·회수지 주소는 읽지 않음(시험으로 확인). 크롬: 출고중지 요청 9-30~10-30 조회 정상(0건). 시험 41개·tsc 0.
- 10-30 **플랜 A 묶음**(주인님 채팅 승인): A1 `lib/actions/today.ts` `todaySummaryAction`(발주서 ACCEPT·INSTRUCT, 반품 RU·UC 미처리 = `blockedOrderIds` 크기, 4번 동시 조회, `TODAY_READ_GAP_SECONDS` 30) + `components/TodayBoard.tsx`(대시보드 `/home`, 링크 `/orders?status=`·`/returns?view=` — 두 페이지가 `searchParams`로 시작 상태를 받고, 주문 화면은 이때 기간을 31일로) · A4·A2 `acknowledgeOrdersAction(ids, {from,to})`가 성공 뒤 INSTRUCT 목록(최대 3쪽)을 `preparing`으로 돌려줌 → `OrderSheets`가 처리 전 「우편번호 주소 수취인」과 비교해 바뀐 배송번호를 빨갛게 표시하고 바로 상품준비중 목록으로 전환(송장 입력 이어서). 다시 읽기 실패는 처리 결과에 영향 없음(예전 안내 문구로 대체). 크롬: 「오늘 할 일」 실제 조회(4건 모두 0)·카드 누르면 상태·31일 기간 맞게 열림 확인. 처리 뒤 전환·주소 비교는 주문이 생긴 뒤 확인. 시험 41개·tsc 0.
  - 함정: 크롬 화면 캡처가 30초 시간 초과로 실패하는 일이 있음 → `find`로 칸 값을 읽어 확인.

## 2026-10-31 — 공개 전환(DB만, 빌드 없음)
- 주인님 결정: 비공개 예외 코드를 만들지 않고 AIMaster 기본 사용 정책을 따른다 → `programs.is_active` true. 시험 계정 `buylifemall@naver.com` 사용기간 2026-11-14까지(`grant_source` 비어 있음, 관리자 화면 부여와 같음). VIP 자동 부여 145명도 사용 가능.
- ⚠ 쿠팡 쓰기(상품 저장·옵션 변경·주문 처리)는 공개 시점까지 실제 시험 0회. 다른 쿠팡 계정 키는 시험 계정 `/connect`에 주인님이 직접 등록.
