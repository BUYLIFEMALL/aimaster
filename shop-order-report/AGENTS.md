# AI 쇼핑몰 주문·매출 리포트 자동화 (`shop-order-report`)

- 운영 주소: https://shop-order-report.buylife.xyz · 소개: https://www.buylife.xyz/programs/shop-order-report
- 현재 버전: **v1.03** (2026-10-25) · Vercel 프로젝트 `shop-order-report` · 카테고리 이커머스 · 기본 프로그램
- 담당 역할: `ecommerce-image` · 플랜 [`docs/PLAN_20261025_SHOP_ORDER_REPORT.md`](docs/PLAN_20261025_SHOP_ORDER_REPORT.md) · 쇼핑몰 묶음 E7·E8([인계](../docs/analysis-ecommerce-bundle-20261024/HANDOFF_20261024_ECOMMERCE.md) §7)

## 1. 사용 목적·대상
판매 「후」 단계 리포트. 마켓 판매자센터에서 받은 주문·정산 엑셀을 올리면 주문 현황·매출·순이익·재고 소진·리뷰 개선점을 정리한다. 숫자는 모두 회원이 올린 실제 파일에서 계산(E8 「내 스토어 진짜 지표」). 대상: 여러 마켓 셀러, 재고를 직접 관리하는 1인 판매자, 리뷰로 상품을 고치려는 판매자.

## 2. 기술·도구
Next.js 16 + Tailwind 4 + 공용 Supabase(권한 판정·회원 키 조회만). SheetJS 0.20.3(읽기·내보내기), IndexedDB(`shop-order-report` DB, `kv` 저장소: `orders`·`settings`), 그래프는 라이브러리 없이 SVG. 리뷰 AI 요약만 서버 API(`/api/reviews/summary`, 회원 본인 `user_api_keys` gemini, 모델 `gemini-3.5-flash-lite`). 뼈대는 `seller-label-docs` 복사.

## 3. 기능·구조·장단점
- **저장 방식 A(주인님 결정 2026-10-25)**: 주문은 회원 PC 브라우저(IndexedDB)에만, 서버 데이터 표 없음. 개인정보 열(`PERSONAL_HINTS`: 수취인·구매자·주소·배송지·연락처·전화 등)은 열 맞추기 후보에서 빼고 값을 읽지 않는다(크롬에서 저장소 값에 이름·전화·주소 없음 확인).
- 화면: `/home` 최근 30일 요약·추이 · `/upload` 마켓·열 자동 인식(`src/lib/orders/markets.ts`), 열 맞춤 기억, 중복 제거(마켓|상품주문번호 또는 주문번호#상품#옵션), 예시 파일 · `/orders` 상태 6종 · `/report` 일·주·월·상품·마켓, 순이익, 엑셀·인쇄 · `/inventory` 7·14·30일 판매 속도 · `/reviews` 별점·자주 나온 말·불만, 선택 AI 요약 · `/settings` 원가·포장비·수수료·재고·택배비·광고비, 설정 파일 내보내기/가져오기 · `/guide`.
- 순이익: 정산액 열 우선, 없으면 `src/lib/marketFees.ts` 대표 수수료로 추정(G마켓·옥션 ✅ ESM 공식, 쿠팡·11번가·스마트스토어 ⚠ 미확인) → 원가·포장비 → 택배비(주문당)·광고비(기간).
- 장점: 개인정보·주문이 서버에 안 감, 운영 비용 0, 몇 달 치 추이 보관. 단점: 다른 기기와 자동 공유 안 됨(설정만 파일로 옮김), 마켓 파일 양식은 실제 파일로 검증 전(예시 파일·별칭 추측), 암호 걸린 엑셀 불가, 수수료 추정은 대표값.

## 4. 버전 기록
- **v1.03 (2026-10-25, E9)**: 「주문 현황」에 「🏷 발송 전 주문 N건 라벨 만들기」 — 셀러 라벨로 보내기(주소 「#import=」 안 표, 서버·개인정보 없음, 최대 300줄 초과 시 엑셀 안내)·라벨용 엑셀 받기(`LABEL_HEADERS`). 대시보드 위 「🛒 쇼핑몰 흐름」 띠(`?flow=shop`일 때만). 공용 기준 코드 `shop-flow`(`src/lib/shopFlow.ts`)·`shop-flow-bar`(`src/components/ShopFlowBar.tsx`) 신설 — 사본은 셀러 라벨·상품소싱, 직접 고치지 말고 기준만 고친 뒤 `node scripts/check-shared-modules.mjs --sync`. 대기 중이던 E1 `market-fees` 확장도 함께 나감. 시험 22개, 배포 `b0s1sfp6u`, DB v1.03. 플랜 [`docs/PLAN_20261025_E9_SHOP_FLOW.md`](docs/PLAN_20261025_E9_SHOP_FLOW.md).
- **v1.02 (2026-10-25)**: 쿠팡 「묶음배송번호」를 상품주문번호로 쓰지 않음(한 상자 여러 상품이 한 줄로 합쳐지는 문제), 재고 표 순서를 판매량 순으로 고정(입력 중 줄이 움직여 다른 상품에 입력되던 문제). 배포 `shop-order-report-dxj1g8phk`.
- **v1.01 (2026-10-25)**: 첫 공개 — 7개 화면·리뷰 AI 요약·DB 등록(요금제 3단계·VIP 등급 표·시험 계정 30일)·도메인·썸네일. 배포 `shop-order-report-gndfngy99`.

## 5. 남은 일
[`docs/IMPROVEMENT_BACKLOG.md`](docs/IMPROVEMENT_BACKLOG.md) — 1순위: 주인님이 주실 실제 마켓 주문 파일(개인정보 지운 사본)로 별칭·상태 사전 보정. 3차 후보: 마켓 API 자동 수집(회원 본인 판매자 키, 별도 플랜).

## 6. 연계 아이디어
- `src/lib/marketFees.ts` = 공용 기준 코드 `market-fees`(docs/SHARED_MODULES.md) → 상품소싱 E1 마진 계산이 사본으로 가져감.
- 상품소싱의 소싱 후보 ↔ 실제 판매 결과 비교(소싱 점수가 맞았는지).
- 셀러 라벨(`seller-label-docs`)로 「발송 전 주문」 라벨 바로 인쇄 — ✅ v1.03(E9). 남은 것: 상세페이지 띠 사본(agy `shop-detail-page` 작업 끝난 뒤).

## 7. UI/UX 개선안
「셀러 워크벤치 스타일」 공유. 후보: 기간 빠른 선택(이번 달·지난달), 상품 이름 묶기(마켓마다 다른 상품명을 한 상품으로), 리포트 PDF에 그래프 포함 정리.

## 2026-10-26 ✅ v1.04 — 「🙈 사진 속 개인정보 가리기 ↗」 바로가기 (Claude Code 윈도우 `claude-win-sdp`, [역할: ecommerce-image])
- 홈 「작업 순서」 카드 끝과 「리뷰 분석」 화면 왼쪽에 바나나 캔버스 무료 이미지 도구 `https://banana-canvas.buylife.xyz/tools?tab=face`(새 탭) 바로가기. 이 프로그램에는 송장·후기 사진 화면이 없어 사진을 넘기지 않고 바로가기로 연결(키·비용 없음). 커밋 `38180d0d9`. 운영 크롬에서 주소·새 탭 확인.
