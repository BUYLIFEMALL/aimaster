# AI 쿠팡 운영 자동화 (`coupang-ops`) — 에이전트 인수인계

> 루트 `../CLAUDE.md`(메인 지침)를 함께 읽는다. 한국어 진행 안내·회원 본인 계정/키·비용 사전 승인·경로 지정 커밋 규칙이 그대로 적용된다.
> 플랜: [`docs/PLAN_20261028_COUPANG_OPS.md`](docs/PLAN_20261028_COUPANG_OPS.md)(API 103개 목록 §10, 고정 IP 비용 §11·§12, 확정 §13·§14, 제한·제재 §15) · 기능 대기 목록: [`docs/IMPROVEMENT_BACKLOG.md`](docs/IMPROVEMENT_BACKLOG.md)
> **현재 상태는 아래 §1~7과 맨 아래 날짜별 기록을 먼저 읽는다.** 2026-10-29 인수인계: [`docs/IMPROVEMENT_HANDOFF_20261029.md`](docs/IMPROVEMENT_HANDOFF_20261029.md) — 판매 재개·상품 등록 화면·짧은 이미지 주소·반품비 규칙·남은 일(등록 실행 → 최종 배포).
> 이전 인수인계(2026-10-28): [`docs/IMPROVEMENT_HANDOFF_20261028.md`](docs/IMPROVEMENT_HANDOFF_20261028.md) — 판매정지로 쿠팡 API가 막혀 멈춘 상태·운영 DB 적용 내용·코드 지도·함정·다음 첫 단계.
> **📘 쿠팡 API 공식 사이트 먼저(2026-10-30 주인님 지시: 「여기 쿠팡 api전용 싸이트가 있으니 자세히 읽어보고 기능 구현하도록 해」「앞으로도 여기 관련 내용 확인하고 구현하도록 해」)**: 쿠팡 기능을 만들거나 고치기 전에 **https://developers.coupang.com/ko/api?market=KR** 목록에서 해당 API의 상세 페이지(`/ko/api/<묶음>/<이름>?market=KR`)를 읽고 경로·메서드·요청 본문·응답 필드·적용 상태·오류를 코드와 대조한 뒤 구현한다. 코드 주석에 상세 페이지 이름과 확인 날짜를 남긴다. 기억이나 다른 프로그램 코드로 추측하지 않는다.
>   - 10-30 기존 작업 검토 결과: 코드가 부르는 경로 12개·메서드가 공식 목록과 모두 일치. 옵션 재고(`amountInStock`·`salePrice`·`onSale`)·가격 변경(`forceSalePriceUpdate` 기본 false 유지)·상태변경이력(`status`·`comment`·`createdBy`·`createdAt`)·카테고리 추천(`productName`, `autoCategorizationPredictionResultType`·`predictedCategoryId`) 응답 필드도 명세와 같음 — 고칠 곳 없음. 남은 확인: 송장 수정 본문 형식(명세 표의 타입 표기 차이, AGENTS 10-30 C3-3 항목).
>   - 기능 확장 기획: [`docs/PLAN_20261030_COUPANG_API_AUTOMATION.md`](docs/PLAN_20261030_COUPANG_API_AUTOMATION.md)(관점 6가지·추천 순서·하지 않을 것).
> 담당 역할: `ecommerce-image`(Claude Code 윈도우 `claude-win-sdp`). 마켓 등록기 공통 레퍼런스: [`../docs/MARKETPLACE_REGISTER_ANALYSIS_GUIDE.md`](../docs/MARKETPLACE_REGISTER_ANALYSIS_GUIDE.md).

## 1. 사용 목적·대상
**목표(2026-10-31 주인님): 「자동화 프로그램의 목적은 사용자의 편리성,효율성」, 「이 자동화 프로그램을 사용하면 판매자 입장에서 쿠팡 운영이 편해진다」.** 기능을 고를 때 반복·단순 작업이 줄어드는지 먼저 본다.
쿠팡 판매자가 **공식 WING Open API(회원 본인 키, 연동 방식 「자체개발」)**로 상품 등록·수정, 가격·재고, 주문·송장, 출고중지·반품·교환, 문의, 매출·정산, 쿠폰, 아침 요약을 WING을 오가지 않고 처리한다.

## 2. 기술·도구
Next.js 16(App Router, `src/proxy.ts`) · React 19 · Tailwind 4 · Supabase 공용 DB(ref `esgxyikcnnvmlhygjkth`) · `undici` `ProxyAgent`(회원 고정 IP) · `xlsx`(브라우저 파일 처리) · `sharp`(이미지 규격) · AI는 회원 본인 OpenAI·Claude·Gemini 키. 뼈대는 `smartstore-register`에서 가져왔다. 쿠팡 호출은 **회원 본인 고정 IP 프록시**(공용 키 `fixed_ip_proxy_url`, Fixie 등)를 거친다. 쿠팡이 WING 허용 IP만 받기 때문이며 운영자 `FIXIE_URL`은 쓰지 않는다. 확장 없음.

## 3. 핵심 기능·구조·장단점
| 부분 | 화면·파일 | 하는 일 |
|---|---|---|
| 연결 | `/connect`, `lib/coupang/keys.ts`, `actions/connection.ts` | 고정 IP 주소·WING 키·키 만료일·AI 키, 연결 시험 |
| 호출 | `lib/coupang/client.ts`·`sign.ts`·`usage.ts` | HMAC 서명, 회원 프록시, 429는 GET만 1회 재시도, 쓰기 재시도 없음, 호출 수·쿠팡 경고 기록 |
| 상품 | `/products`, `/products/new`, `/my-products`, `product.ts`·`productEdit.ts`·`productCopy.ts`·`category.ts`·`brand.ts` | 상세페이지 상품·직접 입력·복사 등록, 템플릿, 카테고리 추천·찾아보기, 브랜드 찾기, AI 추천, 승인 요청, 수정 |
| 가격·재고 | `/stock`, `/bulk`, `ItemsPanel`, `items.ts`·`bulk.ts` | 품절 점검, 일괄·엑셀 변경, 자동생성옵션 |
| 주문 | `/orders`, `orders.ts`·`orderFile.ts`·`lib/sheet.ts` | 상품준비중 처리, 발주서·송장 파일, 오래 멈춘 배송, 장기 미배송 |
| 취소·반품·교환 | `/returns`, `/exchanges`, `returns.ts`·`exchanges.ts`·`logisticsWrite.ts` | 출고중지, 입고·승인, 교환 처리, 회수 송장, 철회 이력 |
| 문의 | `/inquiries`, `inquiry.ts`, `lib/ai/llm.ts` | 답변, AI 초안, 템플릿, 고객센터 남은 시간 |
| 정산·쿠폰 | `/revenue`, `/coupons`, `revenue.ts`·`coupons.ts`·`downloadCoupon.ts` | 실제 수수료·순이익, 지급 내역, 즉시·다운로드 쿠폰 |
| 기본값 | `/defaults`, `LogisticsPanel`, `defaults.ts` | 배송·반품 기본값, 출고지·반품지 만들기·고치기 |
| 알림·정리 | `/alerts`, `api/cron/coupang-summary`, `api/cron/cleanup`, `lib/alerts/` | 아침 요약(텔레그램·메일·카카오), 30일 정리 |
| 첫 화면 | `/home`, `TodayBoard`, `RejectedBoard` | 오늘 할 일과 그 자리 처리, 반려 상품, 키 만료·쿠팡 경고 |
| 설정 표 | `coupang_ops_defaults`·`_prefs`·`_jobs`·`_alerts`·`_image_links`, 공용 `user_api_keys` | 회원별 격리(RLS) |

장점: 공식 API라 화면 자동화보다 안정적이고, 쓰기는 직전 상태 재확인·2단 확인·재시도 없음으로 안전하다. 고객 개인정보를 저장하지 않는다.
단점: 회원이 Fixie 가입과 WING IP 등록을 해야 한다. 쓰기 기능 대부분이 실제 건 시험 전이다. 이미지·옵션 구성 수정은 WING에서 해야 한다.

## 4. 버전·이력
운영 v1.14(2026-10-31). 버전별 상세는 이 문서 아래 날짜별 기록과 `git log -- coupang-ops`.

## 5. 남은 일
[`docs/IMPROVEMENT_BACKLOG.md`](docs/IMPROVEMENT_BACKLOG.md) · [`docs/IMPROVEMENTS.md`](docs/IMPROVEMENTS.md). 배포 절차와 주의는 맨 아래 v1.12 항목.

## 6. 연계
상세페이지 자동화(상품) → 이 프로그램 / 스마트스토어 등록기로 같은 상품을 두 마켓에. 매출은 `shop-order-report`로 파일 전달. `coupang/` 기획은 흡수했으며 폴더 정리는 주인님 승인 뒤. 고정 IP 프록시 키는 공용이라 토스 등 다른 프로그램도 재사용할 수 있다.

## 7. 디자인·UI
「쿠팡 셀러 콘솔 스타일」(v1.10부터) — [`docs/DESIGN_HANDOFF.md`](docs/DESIGN_HANDOFF.md). 개선 제안은 `docs/IMPROVEMENTS.md`.

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

## 2026-10-31 — v1.02 바코드·품번(운영 배포)
- 명세 `/ko/api/products/product-creation`(10-31 확인): `items[].barcode`·`emptyBarcode`·`emptyBarcodeReason`(100자)·`modelNo`, `brand`는 띄어쓰기·특수문자 없이, 없으면 `GENERIC`. 명세 표에는 필수 표기가 없지만 신규 키 판매자 정책 때문에 `checkDraft`가 옵션마다 바코드나 모델번호 중 하나를 요구한다(기존 판매자도 동일 적용, 결정 사항).
- 화면: 옵션 표에 두 칸 추가. 시험 43개·tsc 0·빌드 통과. 크롬(시험 계정): 비우면 막힘, 품번 넣으면 검사 통과. 쿠팡 쓰기 0회 — **`emptyBarcode` 본문이 실제로 받아들여지는지는 첫 「저장만」에서 확인**.
- 시험 계정 기본값 저장: 출고지 22577646, 반품지 1002133369, 발송비 4,000원, 반품비 편도 5,000원. 반품지 이름이 화면에 「-」로 보여 `returnChargeName` 값 확인 필요.

## 2026-10-31 — 첫 「저장만」 실제 시험(주인님 승인 1건, 코드 변경 없음)
- 대상: 시험 계정(다른 판매자 키) · 스위스톤 백팩 · 카테고리 #69805 · 블랙/FREE 1개 · 정가 99,000원·판매가 56,000원·재고 100 · 품번 ST4D18 · 바코드 없음 · `requested: false`. 기록 `coupang_ops_jobs` 704c833c.
- 결과: 쿠팡 생성 응답 `SUCCESS`, 상품번호 **16433502859** → **`emptyBarcode` + `modelNo` 본문을 쿠팡이 받아들임**. 재전송 없음.
- ⚠ 그런데 약 50초 뒤와 약 2분 30초 뒤 조회 모두 상태 **「승인반려」**(승인 요청을 안 보냈는데 나옴). 화면 안내 「임시저장으로 남는다」와 다르다. 사유는 앱에 안 나와 **WING에서 확인 필요**. 이미지 받기 실패·콘텐츠 자동 심사·`returnChargeName` 등은 모두 추정일 뿐 미확인.
- 코드 대조: `/ko/api/products/query-a-history-of-product-status-updates`(버전 2609170000)와 경로·`status`·`comment` 칸 이름은 일치. 원인 구분을 막는 곳: `refreshJobStatusAction`의 이력 조회 `.catch(() => [])`(실패와 빈 사유를 구분 못 함), 원본 이력을 저장하지 않음.
- 고칠 후보(미착수, 다음 배포에 함께): 첫째, 이력 조회 실패를 화면에 표시하고 사유 없는 이력의 원문을 기록. 둘째, `sendProductAction`이 `rejected` 기록도 재전송을 막으므로(`neq failed`) 반려 뒤 고쳐 보내는 길이 없음 — 수정 API(`상품 수정 (승인필요)`) 또는 삭제 후 재등록 중 사유를 본 뒤 결정. 셋째, 화면 문구 「저장만 → 판매되지 않음·WING에서 승인 요청」을 실제 동작에 맞게 정정.
- 판매 여부: 반려 상태라 판매되지 않는 것으로 판단하나, WING 화면 확인 전. 다른 판매자 계정 WING에 기록이 남아 있음(삭제 안 함).
- **반려 사유 확정(주인님 WING 캡처, 같은 날)**: 「[블랙 / FREE]: 기타이미지(DETAIL) 이미지는 최대 10M 이미지, 최소 500&500, 최대 5000*5000 길이를 만족해야합니다.」 저장소 실측: 추가1 780×12996, 추가2 780×13495(`reference_image_urls`, 세로 5000 초과가 원인) · 대표 492×492(500 미만 — 이번 사유엔 없지만 규칙 위반) · 상세 9장 1792×2400(`contents`라 이번 사유 아님). 위의 추정 3가지는 틀렸거나 무관. `checkDraft`가 이미지 개수·주소만 보고 실제 크기를 재지 않아 검사를 통과했다.
- WING에 「변경이력 및 반려사유」가 있는데 API 경로로 사유를 못 읽은 이유는 여전히 미확인(`.catch` 때문에 구분 불가).
- 수정 플랜: 아래 v1.03에서 처리.

## 2026-10-31 — v1.03 이미지 규격·반려 처리(운영 배포, 재시험 통과)
- `lib/coupang/imageRules.ts`(판정, 시험 있음) · `lib/shopImageCheck.ts`(대표·추가 이미지를 `sharp`로 실측, 검사와 보내기 직전 모두) · 규격 밖 추가 이미지는 자르지 않고 빼고 경고 · 500 미만 정사각 대표 이미지는 `/i/[id]`가 보낼 때 1000×1000으로 확대(저장 안 함 — 플랜의 「회원 폴더 저장」에서 바꿈, 고아 파일·30일 정리 문제가 없어서). 상세(`contents`) 이미지는 명세에 규격이 없어 판정 안 함.
- 삭제 `deleteJobProductAction`: 명세 `/ko/api/products/delete-a-product`. 직전 상태를 다시 읽어 승인반려·임시저장만 허용, 재시도 없음. 기록 표 상태에 삭제가 없어 `failed` + 문구 머리말 `DELETED_PREFIX`로 표시(다시 보내기 허용). 명세 오류 설명은 「저장중·임시저장만」이지만 **승인반려도 실제 삭제 성공**.
- 이력: 조회 실패를 문구로 구분, 상태 이름이 달라도 내용 있는 최신 이력을 사유로 표시. 배포 뒤 같은 반려 건에서 사유가 표시됨(이전에 비어 있던 원인이 상태 이름 차이인지 시간차인지는 미확인).
- 실제 시험(시험 계정 키): 16433502859 삭제 → 재전송 16433545652, 약 70초 뒤 **「임시저장」**. 대표 공개 주소 실측은 HANDOFF 참고. 시험 48개·tsc 0·빌드 통과.
- 16433545652는 **중지 유지**(2026-10-31 주인님 지시: 「삭제는 하지말고 중지만 시켜놔」). 승인 요청·삭제를 하지 않으며, 주인님이 다시 지시할 때만 재개한다. 승인 요청 기능은 프로그램에 아직 없다.
- 남은 일: 그 계정 WING에 임시저장 1건 남아 있음(주인님 판단). 승인 요청은 안 보냄 — 쿠팡 승인 심사 통과 여부는 미확인. 다음 후보: 옵션 변경 1건 시험(승인 필요).

## 2026-10-31 — v1.04 품절 예방(B1)·반려 알림(B3)(운영 배포)
- B1 `/stock`: 버튼을 눌렀을 때만 상품 20개·옵션 60개씩 재고 점검, 품절·부족(기준 수량은 브라우저 저장)·판매 중지 분류, 재고 변경은 2단 확인 뒤 1건씩(재시도 없음). 옵션 재고가 1개당 1회 호출이라 자동 점검은 하지 않는다(Fixie 월 2,500회 추정, 토스와 공유).
- B3 첫 화면 「반려된 상품」: 기록의 `rejected` 최근 10건(DB만 읽음), 「등록 상태 다시 확인」은 `saved`·`requested` 최근 5건(1건당 2회, 30초 간격).
- 실제 확인(시험 계정 키): 재고 점검 호출 3회, 승인 상품 1개·옵션 1개 「품절」 표시. 상태 다시 확인 1건 정상, 반려 0건. 쿠팡 쓰기 없음.
- 미확인: 반려 목록이 실제로 채워진 화면, 재고 변경 실제 전송(요청함 `3bb801f0` 승인 대기), 767px 이하 화면, 20개 넘는 「다음 20개」.

## 2026-10-31 — v1.05 묶음 1: 호출 수 집계·승인 요청(운영 배포)
- 플랜 `docs/PLAN_20261031_COUPANG_COMPLETION_AND_EXPANSION.md`. Fixie 요금제는 Tricycle 월 500회이며 유료 전환은 주인님이 필요할 때 결정(2026-10-31).
- 호출 수: `wingRequest`가 호출마다 `usage_logs`(action `coupang_api_call`)에 기록. 회원별 하루 100회(`COUPANG_DAILY_CALL_LIMIT`), 월 500회(`FIXIE_MONTHLY_LIMIT`). 상한은 재고 점검·오늘 할 일·상태 다시 확인·내 상품 목록에만 걸고, **주문·송장·쓰기는 막지 않는다.** 95%에서 선택 조회 중지, 70%에서 요청함에 달마다 1회 자동 알림. 토스 사용량은 집계되지 않음.
- 승인 요청: 등록 기록의 「판매 승인 요청」 2단 확인, 직전 상태 재확인, 재시도 없음. 브랜드 검사: 검사 때 GENERIC이 아니면 쿠팡 목록과 대조(경고만). 카테고리 유효성은 명세가 수시 검사 불필요라 뺌.
- 확인: 재고 점검 호출 3회 → 첫 화면 「3 / 100회」, 승인 요청 버튼 표시. **승인 요청은 실제로 보내지 않음(16433545652 중지 유지).** 미확인: 상한 도달 문구, 70% 알림, 브랜드 경고 실제 응답, 승인 요청 전송.

## 2026-10-31 — v1.06 묶음 2: 고객 문의·AI 답변 초안(운영 배포) + 기간 수정 미배포 대기
- 새 화면 `/inquiries`(`InquiryBoard`, `lib/coupang/inquiry.ts`, `actions/inquiries.ts`, `lib/ai/claude.ts`): 상품 문의 미답변 + 고객센터 미답변·미확인(읽기 3회, 10초 간격), AI 초안(회원 본인 anthropic 키, claude-opus-5-5, effort low, 재시도 0, 저장 없음), 답변 2단 확인, 미확인 확인 처리. 대괄호 [ ]가 남으면 보내기 버튼을 숨김. 오늘 할 일에 미답변 문의 추가(읽기 6회).
- 개인정보: `redactInquiry`가 고객명·연락처 줄, 전화, 메일, 10자리 이상 번호를 가린 뒤 화면과 AI에 넘긴다. 문의 내용은 저장하지 않는다.
- 플랜과 다른 점: 주문·배송 상태를 AI에 자동으로 넣지 않고 회원이 「초안에 쓸 사실」을 적는다(호출 수·개인정보 절약). 상품 문의의 상품명은 응답에 없어 상품번호로 표시.
- **명세와 다른 실제 동작:** 상품 문의 조회는 시작·종료일 차이 7일을 400으로 거절한다. 오늘 포함 7일(차이 6일)로 수정, 커밋 `7311f0e59`, **미배포 대기(운영 v1.06은 상품 문의 조회 실패·오늘 할 일 미답변 칸 「확인 실패」)**.
- 확인: 고객센터 조회 2건 정상 0건. AI 초안 실제 2회(관리자 본인 키): 모르는 사실 [ ] 처리, 문의 안의 전액 환불 지시 따르지 않음. 미확인: 실제 문의 카드 화면, 답변·확인 처리 전송, 상품 문의 조회 성공.

## 2026-10-31 — v1.07 상품 문의 기간 수정(운영 배포)
- 위 미배포 대기분(`7311f0e59`) 배포. 운영 확인: 조회 3건 모두 경고 없이 통과, 기간 2026-10-25~10-31, 처리할 문의 0건.
- 남은 미확인: 실제 문의 카드 화면, 답변·확인 처리 전송(실제 문의가 생긴 뒤 승인 1건). 다음은 묶음 3(반품·교환), 범위와 비용 승인 먼저.

## 2026-10-31 — v1.08 묶음 3: 반품·교환·오래 멈춘 배송(운영 배포)
- 반품: `/returns`에 입고 확인(반품접수 + 출고된 건)·반품 승인(입고완료, 환불 발생). 직전 상태 재확인, 재시도 없음, 끝난 뒤 다시 읽어 다음 단계 표시.
- **명세 한계:** 반품 조회 코드는 RU·UC·CC·PR뿐이라 입고완료만 따로 불러올 수 없다. 승인 버튼은 입고 확인 직후 다시 읽은 건, 또는 조회 결과에 그 상태로 온 건에만 나타난다. 빠른환불 대상은 입고 확인에서 바로 끝날 수 있다.
- 교환: 새 화면 `/exchanges`(`lib/coupang/exchanges.ts`, `actions/exchanges.ts`). 입고 확인, 교환 송장(회수 완료 + 새 shipmentBoxId, 입고 확인 후 최대 10분), 거부(SOLDOUT·WITHDRAW만). 단건 조회가 없어 주문번호로 다시 읽는다. 고객 이름·전화·주소는 읽지 않고 사유 글은 `redactInquiry`로 가린다.
- 오래 멈춘 배송: `/orders` 아래 `StaleShipments`(읽기 2회, 30초 간격), 주문일 기준 배송지시 3일·배송중 5일, 건별 배송 이력(읽기 1회). 표시만 하며 장기 미배송 배송완료 처리는 만들지 않았다.
- 오늘 할 일에 처리 중인 교환 추가(읽기 7회). 시험 실행기가 런타임 형제 가져오기를 찾도록 `tsconfig` `allowImportingTsExtensions` + `.ts` 확장자.
- 확인: 교환 조회·오래 멈춘 배송·오늘 할 일 6칸 모두 오류 없이 0건(미답변 문의 칸 포함). 미확인: 반품·교환 쓰기 전체, 실제 건 화면, 교환 응답의 `maxPerPage=50`은 통과했으나 실제 행 필드는 명세 예시 기준.

## 2026-10-31 — v1.09 묶음 4: 매출·정산(운영 배포)
- 새 화면 `/revenue`(`lib/coupang/revenue.ts`, `actions/revenue.ts`, `RevenueReport`): 매출인식일 기준 매출(최대 30일, 어제까지), 옵션별 실제 수수료율(서비스 이용료 + 부가세), 순이익 = 정산액 − 판매자 쿠폰 − 개당 원가 × 순판매수량, 광고비 입력과 ROAS, 지급 내역(예금주·계좌 칸은 읽지 않음). 서버 저장 없음, 원가·목표 이익률은 브라우저에만.
- 원가가 없으면 순이익을 표시하지 않는다. 반품은 명세 예시가 양수라 음수로 맞춘다(실제 응답 미확인).
- 소진 예측: 판매된 옵션을 많이 팔린 순으로 최대 20개만 재고 조회(버튼, 옵션당 1회).
- 주의 항목은 규칙으로만: 이익률 목표 미달, 판매 5개 이상에서 반품률 10% 이상. AI 호출 없음.
- `shop-order-report` 연계: 코드 수정 없이 탭 구분 파일(.tsv)로 전달. 그쪽 `parsePasted`가 따옴표를 처리하지 않아 쉼표가 든 옵션명이 밀리므로 CSV를 쓰지 않는다. `tests/revenue.test.mjs`가 그쪽 `guessMapping`·`normalizeStatus`로 직접 확인한다.
- `coupang/` 기획 흡수: 공헌이익·소진·마진/반품 경고는 여기로 옮겼다. 경쟁사 수집과 광고 CSV 분석은 넣지 않았다. 폴더 정리는 백업 규칙대로 주인님 승인 뒤.
- 확인: 매출·지급 조회 실제 호출 통과, 시험 계정 실적 0건. 미확인: 실제 매출이 채워진 표·합계·파일 받기·소진일 화면, 반품 금액 부호, 지급내역 응답 모양(빈 결과와 형식 차이를 구분 못 함).

## 2026-10-31 — v1.10 묶음 5: 상품 수정·일괄 변경·쿠폰 + WING 스타일(운영 배포)
- 상품 수정: `/my-products` 「상품 수정」(`ProductEditPanel`, `lib/coupang/productEdit.ts`, `actions/productEdit.ts`). 상품명·브랜드·검색어는 조회 JSON 전체를 다시 읽어 고친 칸만 바꿔 PUT(승인된 상품은 `requested: true`, 재승인 뒤 반영). 배송·반품은 `/partial`(승인 불필요, 승인 상품만). 이미지·옵션 구성 수정은 범위 밖(WING 안내).
- 옵션 관리에 할인 기준가 변경. `/bulk`(`BulkEditor`, `lib/coupang/bulk.ts`): 재고 점검 조회를 재사용해 옵션 선택 → %·금액·같은 값 → 미리보기 → 30건 상한 → 2단 확인 → 기존 변경 액션을 1건씩(재시도 없음, 직전 값 재확인). 같은 화면에 자동생성옵션 전체 켜기·끄기.
- `/coupons`(`CouponBoard`, `lib/coupang/coupons.ts`, `actions/coupons.ts`): 즉시할인만. 계약·예산·목록·생성·처리 결과 확인·옵션 추가·파기. 다운로드 쿠폰은 범위 밖.
- 디자인: 주인님 지시로 WING 판매자 화면 기준 「쿠팡 셀러 콘솔 스타일」. 위쪽 흰 헤더(로고 복제 없음), 왼쪽 메뉴 묶음(`MENU_GROUPS`), 파랑 강조(`globals.css` `@theme`), 왼쪽 파란 줄 안내 상자. 오류·품절·위험 표시는 빨강 유지. 「쿠팡 연결」은 매뉴얼 바로 위(`Sidebar` 정렬). 상세 `docs/DESIGN_HANDOFF.md`.
- 확인(시험 계정 키, 쓰기 0회): 쿠폰 계약 #373796·목록 0건 조회, 일괄 옵션 1개 조회와 미리보기(-60 막힘, -10 → 216,000원), 승인 상품 15437165025 수정 패널 값 표시, 400px iframe에서 왼쪽 메뉴 숨김·☰·가로 넘침 없음(창 최대화라 실제 창 폭 검수는 못 함).
- **미확인(쓰기 전체):** 상품 수정·배송 수정·기준가·일괄 적용·자동생성옵션·쿠폰 생성·옵션 추가·파기 모두 실제 전송 전. 조회 JSON을 그대로 PUT해도 쿠팡이 받는지, 예산 응답 모양은 첫 실제 건에서 확인. 16433545652는 중지 유지.

## 2026-10-31 — 옵션 쓰기 실제 시험 통과(요청함 3bb801f0)
- 주인님 승인 1건. 시험 계정 옵션 92120301801(판매 중지·재고 0이라 주문이 들어올 수 없는 상태)에서 가격 240,000 → 239,990 → 240,000, 재고 0 → 1 → 0, 판매 재개 → 중지 모두 쿠팡 반영 확인, 원래 값으로 복구. 재고를 넣은 상태로 판매를 재개하지 않았다. 판매 상태는 응답 뒤 다시 읽으면 바로 바뀌어 보였고, 가격은 표 갱신에 몇 초 걸렸다.

## 2026-10-31 — v1.11 묶음 6·연속 등록·AI 추천·30일 정리·다운로드 쿠폰·장기 미배송(운영 배포)
- 아침 요약 `/alerts`(`DailyAlertPanel`, `actions/dailyAlert.ts`, `api/cron/coupang-summary`, `lib/alerts/cronJob.ts`, 표 `coupang_ops_alerts` 운영 적용): 회원 본인 텔레그램 봇(`user_telegram_links`, 다른 프로그램 봇 재사용)과 본인 cron-job.org 키(공용 `cronjob_org_api_key`)로 하루 1번. 건수만 보내고 쿠팡은 읽기만 7회(한 달 약 210회). 회원 전용 토큰(해시 저장), 날짜 선점으로 하루 1번, 이용 권한·호출 상한 확인. `todaySummaryAction`의 읽기는 `lib/coupang/todayRead.ts`로 분리.
- ⚠ Fixie Tricycle 월 500회라 2명만 켜도 상한(95%)에 닿는다. 많이 켜기 전에 유료 전환 결정이 필요하다. 요청함에 올림.
- 연속 등록(C2-6): 상품 목록에 「쿠팡 등록함」, 저장 성공 뒤 「다음 상품 등록하기」, 직전 브랜드·제조사·카테고리 번호 불러오기(브라우저 저장). 여러 건 자동 일괄 전송은 만들지 않았다(사람 확인 유지).
- AI 추천(C2-7): 3단계 버튼. 회원 본인 Claude 키, claude-opus-5-5, 재시도 0, 빈 칸만 채움, 쿠팡 목록에 없는 값 버림(`lib/coupang/suggest.ts`). 플랜의 구매옵션·고시 추천은 넣지 않았다(고시는 이미 자동, 구매옵션은 추측 위험).
- 30일 정리(C1-15): `api/cron/cleanup` + `vercel.json` 매일 03:30(한국). **`CRON_SECRET` 미등록이라 지금은 401로 아무것도 지우지 않는다.** 등록은 권한 장치가 막아 주인님 몫(요청함). 등록 뒤 배포가 다시 필요하다.
- 다운로드 쿠폰: `/coupons` 아래(`DownloadCouponPanel`, `lib/coupang/downloadCoupon.ts`). 명세 /ko/api/promotions/downloadable-coupon-*. 생성과 옵션 적용을 한 번에(적용 실패 시 쿠팡이 파기). 파기·처리 결과 확인. 목록 API가 없어 번호로만 다룬다.
- 장기 미배송(A6): `/orders` 「오래 멈춘 배송」 아래. 배송번호·송장 직접 입력(조회 기간 31일 밖 주문이 대상이라), 2단 확인, 재시도 없음.
- 일부러 안 한 것: 이미지·옵션 구성 수정(상품 수정 본문을 쿠팡이 받는지 먼저 확인), 로켓그로스(계약 회원 전용, 시험 불가, 수요 미확인), 알림 채널은 텔레그램만.
- 확인(시험 계정, 쿠팡 쓰기 0회): 구분선·v1.11·`/alerts` 화면, 텔레그램 시험 메시지 전송 응답 성공, 켜기·끄기(cron-job.org 작업 생성·중지, 해당 계정에 꺼진 작업 1개 남음), 잘못된 토큰 401 3건, `/coupons` 두 패널 표시, 시험 94개·tsc·빌드 통과.
- 미확인: 실제 요약 메시지 1회 전체 동작(켜 두면 호출을 써서 바로 껐다), 텔레그램 수신은 응답만 확인, AI 추천 실제 호출, 연속 등록 흐름, 다운로드 쿠폰·장기 미배송·정리 작업 실제 동작.

## 2026-10-31 — v1.12 대기: 알림 채널·AI 선택·반복 작업·빠진 API(커밋 완료, 미배포)
- 알림: 아침 요약 받을 곳 이메일·카카오톡 추가(`lib/alerts/deliver.ts`, 회원 본인 SMTP·SOLAPI) `533bdded5`. AI: OpenAI·Claude·Gemini 선택(`lib/ai/llm.ts`·`models.ts`, `AiModelSelect`) `6e656fd51`.
- 반복 작업 `6754b148e`: 발주서·송장 파일(`lib/sheet.ts`, `orderFile.ts`, 브라우저에서만 생성·서버 저장 없음), 「처리하고 발주서 파일 받기」, 50건 나눠 전송, 답변 템플릿·여러 건 초안(보내기는 회원 확인), 복사 등록·상세페이지 없이 등록(`/products/new`), 등록 템플릿, 엑셀 일괄(상한 100), 원가 서버 저장(`lib/coupang/prefs.ts`), 오늘 할 일 안에서 처리.
- 빠진 API `78cfc78c5`(`lib/coupang/logisticsWrite.ts`, `actions/logistics.ts`): 회수 송장(`PickupInvoice`, 반품 RETURNS_UNCHECKED·교환 BeforeDirection일 때만), 반품 철회 이력(최근 7일), 출고지·반품지 만들기·고치기(`/defaults` `LogisticsPanel`, 2단 확인, 재시도 없음), 옵션 단위 자동생성옵션, 쿠폰 적용 옵션 보기.
- 결정: 출고지 수정은 도서산간을 보내지 않는다(조회의 `remoteInfoId`가 비어 있음). 반품지 요금은 12칸을 한 값으로 받는다. 기간별 상품 목록·상품 요약은 호출을 줄이지 못해 만들지 않았다.
- 배포 전 할 일: 운영 DB에 `supabase/migrations/20261031_coupang_ops_prefs.sql` 적용 → 빌드 1회(주인님 승인 대기) → `node scripts/deploy.mjs coupang-ops --go`, `--version-only --set-version v1.12`. 코드의 `APP_VERSION`은 배포 때까지 v1.11이다.
- 검수: 시험 107개·tsc·로컬 build 통과(`78cfc78c5` 기준). 화면 확인과 쿠팡 쓰기 0회. 미확인: 이번 쓰기 전부, 복사 등록의 이미지 경로, AI 3종 호출, 메일·카카오 발송, 택배사 실제 파일 형식, 첫 실제 주문의 번호 정밀도.

## 2026-10-31 — 회원 본인 고정 IP(v1.12에 포함, 미배포)
- 주인님 지시: 「본인 키를 등록해서 사용하게 하고 해당 키 생성 위치와 넣어야 될 값을 플랫폼 연동 쪽에 넣어둬」「매뉴얼에서 관련 내용 추가 해주고」. 커밋 `a143d427b`.
- 왜 필요한가: 쿠팡은 WING 허용 IP에서 온 요청만 받는데 Vercel은 나가는 IP가 바뀐다. Fixie가 항상 같은 IP 2개로 내보낸다.
- 구현: 공용 표 `user_api_keys` provider `fixed_ip_proxy_url`(`validateProxyUrl`이 내부망 주소를 막음, 화면에는 `maskProxyUrl`로 토큰 가림). `wingRequest`가 회원 주소로 호출하고, 운영에서 주소가 없으면 호출하지 않고 등록을 안내한다(운영자 주소 폴백 없음). 연결 시험이 IP 불허면 `outgoingIp`로 나가는 IP를 함께 보여 준다(Fixie 1회, api.ipify.org).
- 제거: 회원 하루 100회·월 500회 상한, 70% 요청함 알림(`callBudgetBlock`). 첫 화면은 이번 달 내 호출 수만 표시. 조회 간격 제한은 유지.
- 화면: `/connect` 1번 칸 「내 고정 IP 만들기(Fixie)」에 발급 위치 링크·값 모양·입력칸(`ProxyKeyForm`), `/guide` STEP 2 신설(이후 STEP 3)·FAQ 2개.
- ⚠ 배포 전 운영 DB에 `supabase/migrations/20261031_fixed_ip_proxy_key.sql`도 적용해야 저장된다. **배포 즉시 주소를 등록하지 않은 기존 회원의 쿠팡 기능이 멈춘다.** 기존 WING 키 보유 회원을 확인하고 시험 계정은 본인 Fixie 등록과 WING IP 교체가 필요하다.
- 공식 확인(2026-10-31 usefixie.com): Tricycle 무료 월 500회·100MB, Commuter $5 월 2,500회, 프록시 그룹당 고정 IP 2개, 주소 형식 `http://fixie:토큰@서브도메인.usefixie.com:80`, IP는 app.usefixie.com. 대시보드에서 주소가 보이는 정확한 메뉴와 가입 첫 화면은 문서에 없어 미확인. 시험 105개·tsc 통과, 실제 Fixie 주소 등록·호출은 미확인.

## 2026-10-31 — v1.12 대기 추가: 사고 방지 묶음(커밋 완료, 미배포)
- S1 `998e1a43b`: 키 저장 시 6개월 뒤를 만료일로 저장(`coupang_ops_prefs.wingKeyExpiry`), 회원이 고칠 수 있음, 30일 전부터 첫 화면·`/connect`·아침 요약 안내. 쿠팡 만료일 조회 API는 확인하지 못해 쓰지 않는다. 기존 키 회원은 날짜를 직접 넣어야 한다.
- S2 `8deed7e30`: 고객센터 미답변에 이관 시각 + 24시간 기준 남은 시간, 임박한 건부터. S3 `d31521697`: 재고 0개 판매 재개 확인 창 경고(막지 않음). S4 `8c1346219`: `X-CAG-Warnings`를 `usage_logs`(번호 지움)에 기록, 첫 화면·연결 시험 표시. S5 `83cd9583d`: `(dashboard)/error.tsx`(Next 16 `retry`)·`not-found.tsx`. S6 `d10a75d75`: 오늘 할 일·아침 요약·오래 멈춘 배송을 3쪽(150건)까지 이어 읽음, 문의는 숨은 건수 안내.
- A4 `e8c4bf879`: 상품 화면에 카테고리 찾아보기(명세 how-to-get-categories, 응답이 한 단계씩이라 누를 때 1회)·브랜드 찾기. 좌측 메뉴 글자 키움 `39b56e0e2`. D2 `bba53c843`: 첫 화면 STEP 카드 제거, 시작 안내는 키 없을 때만, `/connect` 개발용 카테고리 칸 삭제.
- 시험 111개·tsc·로컬 build 통과. 화면·실제 호출은 배포 뒤 확인. 쿠팡 경고 머리글의 실제 값, 24시간 기준 시각이 `replyAt`인지, 카테고리·브랜드 실제 응답은 미확인.

## 2026-10-31 — v1.12 운영 배포
- 운영 DB에 `coupang_ops_prefs`·`fixed_ip_proxy_url` 적용(확인 쿼리: 허용 true, 카탈로그 1, RLS true). 빌드 1회 Ready, DB 버전 v1.12.
- 확인(시험 계정, 쿠팡 쓰기 0회): `/connect` 고정 IP 칸·만료일·연결 시험의 「고정 IP 주소 등록」 안내, `/home` 카드 제거·호출 수, `/guide` STEP 2. 좌측 메뉴 「API키등록·플랫폼연동」은 두 줄로 보인다.
- ⚠ WING 키 보유 회원은 주인님 두 계정뿐. 둘 다 Fixie 등록 전이라 쿠팡 기능이 멈춘 상태다. 시험 계정 아침 요약이 켜져 있어 등록 전까지 요약에 「확인 실패」가 나간다. 그래서 고정 IP 실제 호출, 카테고리·브랜드 찾기, 오늘 할 일 등 쿠팡 조회는 등록 뒤 확인이 남았다.
- `CRON_SECRET` 미등록: 30일 정리는 계속 동작하지 않는다. 등록 뒤 배포 1회 필요.
- 주인님 지시로 나중: S7 쓰기 시험, 이미지·옵션 구성 수정, 로켓그로스. 운영자 `FIXIE_URL`은 Vercel에 남아 있으나 이 프로그램은 쓰지 않는다.

## 2026-10-31 — v1.13 가짜 지표 제거 배포, 가격 제안(미배포)
- AGY 디자인에 고정 숫자(위너 사수율 94.2% 등)와 없는 기능 문구가 들어가 운영에 노출됐다. `0c4545a79`로 제거하고 첫 화면 카드를 실제 건수로 바꿨다. **위너 지표·고정 숫자를 다시 넣지 않는다.** 공식 API 104개에 위너·경쟁가 조회가 없고, 쿠팡 이용약관은 사전 승인 없는 자동화 접근을 금지한다. WING 판매자 약관은 미확인.
- 확인: 회원 Fixie로 연결 시험(주인님 캡처)·오늘 할 일 조회 통과, 쿠팡 쓰기 0회.
- 가격 제안 `3edea4937`(미배포): 옵션 관리 「경쟁가로 가격 제안」(`lib/coupang/priceSuggest.ts`, `PriceSuggest`). 회원 입력 경쟁가·원가·수수료율·최소 이익률로 계산하고 새 판매가 칸만 채운다. 변경은 기존 2단 확인. 경쟁가는 저장하지 않고 원가·수수료율·이익률은 `coupang_ops_prefs`에 저장. 배송비·광고비·쿠폰은 계산에 없다.
- 미확인: 플랫폼별 모델 선택·저장 화면, 카테고리·브랜드 찾기 실제 응답, 가격 제안 화면.

## 2026-10-31 — v1.14 배포
- 가격 제안 `3edea4937` 배포. 크롬: 옵션 표에 칸 표시, 빈 값 안내 확인. 계산 성공은 시험으로만 확인했다(화면에서 계산하면 입력한 원가·수수료율이 회원 설정에 저장되어 시험 값을 넣지 않았다).
- 30일 정리 암호(`CRON_SECRET`, Vercel Production, 이름은 Vercel 고정)는 주인님이 등록. 값 없음·틀린 값은 401 확인. 실제 삭제는 매일 03:30(한국) 실행 뒤 Vercel 로그로 확인이 남았다. 회원 값이 아니다.
