# AI 쇼핑몰 빌더 (`mall-builder`) — 에이전트 인수인계

> 먼저 읽기: [README](README.md)(기능 진행 표·실행 방법) → [3몰 인수인계](../docs/mall/HANDOFF_THREE_MALLS.md) → [T0 운영 이전 플랜](docs/PLAN_20261112_T0_PROD_MIGRATION.md) → [교훈 모음](../docs/mall/LESSONS_LEARNED.md) → 역할 파일 [`docs/roles/mall-builder.md`](../docs/roles/mall-builder.md)
> 운영 https://mall-builder.buylife.xyz · Lab https://dev-mall-builder.vercel.app · 버전 `v1.01`(`src/lib/version.ts` + DB `programs.version`)

## 1. 사용 목적·대상
- 회원(사업자)이 자기 쇼핑몰을 개설·운영하는 프로셀형 B2B 쇼핑몰 빌더. AIMaster 이커머스 카테고리의 **샘플몰**로 운영하고(① B2B 입점몰 → ② 분양몰 → ③ 독립몰), 나중에 배포 키트로 분리해 수강생·외주 사업자에게 판매한다.
- 지금 운영 단계: 샘플몰 구경·주문 시험은 로그인 회원(FREE 배지), 몰 만들기·공급사 초대·분양은 관리자만.

## 2. 기술·도구
- Next.js 16 App Router(`proxy.ts`), React 19, Tailwind, Supabase(@supabase/ssr) + **DB 보안 규칙·security definer 함수 중심**(서버가 남의 데이터를 대신 읽지 않음), 토스페이먼츠(DB 안 http 확장으로 승인·환불), 솔라피 문자·Resend 메일, cron-job.org(회원 본인 키), Claude API(몰 대표 본인 키, 서버 암호화 `MALL_SECRET_KEY`).
- 시험: `node --test tests/`(247개), `npx tsc --noEmit`, ego lite 화면 시험(`ego-browser nodejs < 스크립트`).

## 3. 핵심 구조·장단점
- **플랫폼 스위치**(`src/lib/platform.ts`): `NEXT_PUBLIC_MALL_PLATFORM=aimaster`면 운영 — `proxy.ts`가 모든 요청을 `lib/platform-gate.ts`로 보내 메인 로그인(`.buylife.xyz` 쿠키 공유)·프로그램 이용 권한(`lib/programAccess.ts` 사본, 정지→관리자→핸드폰→FREE→구독→등급+기간)을 확인. 비우면 Lab/키트(자체 로그인).
- 몰 만들기는 운영에서 관리자만: 화면(`lib/platform-admin.ts`) + DB 0058(`profiles.is_admin`이 있을 때만 검사).
- 가격: 화면 엔진 `src/lib/pricing.ts`와 주문 함수(`place_order_v2`·`place_guest_order`) 서버 재계산이 같은 규칙(공동구매가 > 거래처 특가 > 상품 예외 > 카테고리 등급율 > 등급 기본율 → 수량 할인 → 최저 판매가).
- 장점: 몰 데이터 보호가 DB에 있어 화면 실수가 새지 않음, 기능 폭이 넓음(F01~F19·D1~D37·T1). 단점: 디자인은 기능 위주 기본 모양(주인님 시안 대기), 마이그레이션 수가 많음(66개).

## 4. 버전·이력
- `v1.01`(2026-11-12) 운영 이전 시작: 폴더 `labs/mall-builder` → `mall-builder`, 플랫폼 스위치·운영 관문·관리자 전용 몰 만들기(0058), 저작권 고지·저장공간 위젯, T1 등급 할인(0057·0057c).
- 그 이전(Lab, 버전 없음): F01~F19, D1~D37 — [README](README.md) 진행 표·역할 파일 최근 완료.

## 5. 남은 일
- T0 B~E(운영 DB 적용·운영 배포·프로그램 등록·샘플몰) — [T0 플랜 §2](docs/PLAN_20261112_T0_PROD_MIGRATION.md), [대기 목록](docs/IMPROVEMENT_BACKLOG.md)
- T1 남은 것: 공급사 상품 옵션·공급사별 배송비. 그다음 T2 분양몰 → T3 독립몰 → T4 키트.

## 6. 다른 프로그램 연계 아이디어
- 상품 소싱·상세페이지 프로그램(`trending-product-finder`·`shop-detail-page`) → ① 상품 등록 바로 보내기, 카드뉴스·이미지 프로그램 → 분양자 홍보 도구([3몰 인수인계 §4](../docs/mall/HANDOFF_THREE_MALLS.md)).

## 7. 화면·디자인 제안
- 지금은 기능 위주 기본 모양. 주인님 시안을 받으면 몰 테마로 입힘([디자인 인수인계](docs/DESIGN_HANDOFF.md)). 운영 관리자 화면은 좌측 메뉴형으로 바꾸는 안 검토.

## 작업 규칙(요약)
- DB 변경은 `supabase/migrations/`에 파일로 남기고 Lab 먼저 적용·되돌림 시험 → 운영 DB는 주인님 승인 뒤 같은 파일로.
- 손님이 읽는 표에 원가·공급가 칸 금지, 다른 역할은 그 역할만 가진 계정으로 시험, 시험 주문은 알림 대기열을 바로 지움.
- 운영 배포는 `NEXT_PUBLIC_MALL_PLATFORM=aimaster` 필수 — 빠지면 DB 연결이 운영 주소를 거부한다(`lib/supabase/env.ts`).
