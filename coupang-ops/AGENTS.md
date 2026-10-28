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
| DB | `supabase/migrations/20261028_coupang_ops_v1_01.sql` | 프로그램 등록(비공개)·요금제·VIP·테스트 계정 14일 |

## 4. 버전·이력
- v1.01 (2026-10-28, **미배포·DB 미적용**): C1-1 웹 뼈대 — 대시보드(출시 순서)·매뉴얼. tsc·로컬 build 통과.

## 5. 남은 일
1. 주인님 승인 뒤: 운영 DB에 등록 SQL 적용 → Vercel 새 프로젝트 `coupang-ops`·도메인 `coupang-ops.buylife.xyz`·환경변수(Supabase 4개, 이후 `FIXIE_URL`) → 배포.
2. C1-2 키 등록(공용 키 표 「쿠팡 WING Open API」, DB 변경 승인) → C1-3 호출 컴포넌트 → C1-4 연결 시험.
3. 주인님 쿠팡 계정: 10-29 판매 재개 → 키 재발급 → 「자체개발」 + IP 등록(플레이오토 연동은 안 씀, 끊겨도 됨).

## 6. 연계
상세페이지 자동화(상품) → 이 프로그램(쿠팡) / 스마트스토어 등록기(스마트스토어)로 같은 상품을 두 마켓에. 주문·송장은 `shop-order-report`와 연계 예정(C3-3).

## 7. 디자인
「쿠팡 운영 워크벤치 스타일」 — `smartstore-register` 「스토어 등록 워크벤치 스타일」 구조에 강조색만 쿠팡 빨강(`--accent: #be123c`, Tailwind `rose`). 디자인 다듬기는 디자인 담당에게.
