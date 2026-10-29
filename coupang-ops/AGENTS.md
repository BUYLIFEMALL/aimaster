# AI 쿠팡 운영 자동화 (`coupang-ops`) — 에이전트 인수인계

> 루트 `../CLAUDE.md`(메인 지침)를 함께 읽는다. 한국어 진행 안내·회원 본인 계정/키·비용 사전 승인·경로 지정 커밋 규칙이 그대로 적용된다.
> 플랜: [`docs/PLAN_20261028_COUPANG_OPS.md`](docs/PLAN_20261028_COUPANG_OPS.md)(API 103개 목록 §10, 고정 IP 비용 §11·§12, 확정 §13·§14, 제한·제재 §15) · 기능 대기 목록: [`docs/IMPROVEMENT_BACKLOG.md`](docs/IMPROVEMENT_BACKLOG.md)
> **📘 최신 인수인계(2026-10-29, 가장 먼저 읽기)**: [`docs/IMPROVEMENT_HANDOFF_20261029.md`](docs/IMPROVEMENT_HANDOFF_20261029.md) — 판매 재개·상품 등록 화면·짧은 이미지 주소·반품비 규칙·남은 일(등록 실행 → 최종 배포).
> 이전 인수인계(2026-10-28): [`docs/IMPROVEMENT_HANDOFF_20261028.md`](docs/IMPROVEMENT_HANDOFF_20261028.md) — 판매정지로 쿠팡 API가 막혀 멈춘 상태·운영 DB 적용 내용·코드 지도·함정·다음 첫 단계.
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
