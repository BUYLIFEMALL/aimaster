# AI 쿠팡 운영 자동화 (`coupang-ops`) — 에이전트 인수인계

> 루트 `../CLAUDE.md`(메인 지침)를 함께 읽는다. 한국어 진행 안내·회원 본인 계정/키·비용 사전 승인·경로 지정 커밋 규칙이 그대로 적용된다.
> 플랜: [`docs/PLAN_20261028_COUPANG_OPS.md`](docs/PLAN_20261028_COUPANG_OPS.md)(API 103개 목록 §10, 고정 IP 비용 §11·§12, 확정 §13·§14, 제한·제재 §15) · 기능 대기 목록: [`docs/IMPROVEMENT_BACKLOG.md`](docs/IMPROVEMENT_BACKLOG.md)
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
| DB(C1-2) | `supabase/migrations/20261028_coupang_wing_keys_c1_2.sql` | 키 이름 제약에 4개 덧붙이기(운영 DB 현재 목록을 읽어 추가 — 다른 이름 보존) + `integration_catalog` 「쿠팡 WING Open API」 |

## 4. 버전·이력
- v1.01 (2026-10-28, **미배포·DB 미적용**): C1-1 웹 뼈대 — 대시보드(출시 순서)·매뉴얼. tsc·로컬 build 통과. 같은 날 C1-2 키 등록 화면 추가(검사 함수 가짜 값 확인, DB SQL 미적용).

## 5. 남은 일
1. **배포는 모았다가(2026-10-28 주인님 「모았다가 하자」)**: C1-2~C1-14는 로컬(`npm run dev`, 이 PC IP `210.178.96.91`이 WING 허용 IP에 있음)에서 만들고 시험 → 1단계 완성 때 Vercel 새 프로젝트·도메인·환경변수(Supabase 4개·`FIXIE_URL`)·빌드 1회(그때 승인). 운영 DB 등록 SQL은 로컬 시험 시작 때 C1-2 키 목록 변경과 함께 적용(그때 승인).
2. C1-2 키 등록(공용 키 표 「쿠팡 WING Open API」, DB 변경 승인) → C1-3 호출 컴포넌트 → C1-4 연결 시험.
3. 주인님 쿠팡 계정: 10-29 판매 재개 → 키 재발급 → 「자체개발」 + IP 등록(플레이오토 연동은 안 씀, 끊겨도 됨).

## 6. 연계
상세페이지 자동화(상품) → 이 프로그램(쿠팡) / 스마트스토어 등록기(스마트스토어)로 같은 상품을 두 마켓에. 주문·송장은 `shop-order-report`와 연계 예정(C3-3).

## 7. 디자인
「쿠팡 운영 워크벤치 스타일」 — `smartstore-register` 「스토어 등록 워크벤치 스타일」 구조에 강조색만 쿠팡 빨강(`--accent: #be123c`, Tailwind `rose`). 디자인 다듬기는 디자인 담당에게.
