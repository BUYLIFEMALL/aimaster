# 상가·건물·토지 실거래 알림 (`commercial-land-trade-alert`)

주소: https://commercial-land-trade-alert.buylife.xyz · 담당 [역할: realty] · 운영 DB `esgxyikcnnvmlhygjkth`
플랜·실측 근거: [`../real_estate_sales/docs/PLAN_20261031_COMMERCIAL_LAND.md`](../real_estate_sales/docs/PLAN_20261031_COMMERCIAL_LAND.md)

## 1. 사용목적 및 대상
상가·건물·토지 실거래를 지역과 조건으로 모아 보고, 새 거래를 텔레그램으로 받는다. 회원은 직접 수집하지 않는다. 대상은 상가·꼬마빌딩 매입 검토자, 토지 거래 관찰자, 상업용 부동산 실무자.

## 2. 기술 스택
Next.js 16 App Router, Tailwind 4, Supabase 공용 DB, Vercel 예약 호출, 국토부 `NrgTrade`(15126463)·`LandTrade`(15126466). AI 없음.

## 3. 기능·구조·장단점
- 화면: 대시보드(수집 상태), 관심 지역(256곳), 거래 조건, 실거래 목록(CSV), 상세(같은 동 비교), 설정(텔레그램), 매뉴얼.
- 수집 `src/lib/trades/collect.ts`, `api/collect/dispatch`: 5분마다 깨어나 차례가 된 지역만 처리. 지역당 하루 1회, 이번 달·지난달 + 과거 1달씩 채움(최대 12개월). 지역 수 합계 호출을 `commercial_land_api_usage`로 세어 토지 900건에서 멈춤.
- 저장: 공용 `commercial_land_trades`(로그인 회원 읽기), 회원별 RLS `_watch`·`_preferences`·`_user_trades`. 1년 지난 줄은 `api/cron/cleanup`이 삭제.
- 고유 키(`parse.ts`): 고유 번호가 없어 내용 + 같은 키 안 순번. 취소 칸은 키에 넣지 않아 나중에 취소되면 같은 줄이 갱신된다.
- 알림: 지역 첫 수집 뒤, 회원이 지역을 고른 뒤 처음 보인 최근 45일 거래만. 회차당 20건, 보낸 줄만 기록. 봇은 이 프로그램 연결 → 없으면 같은 회원이 다른 프로그램에 연결한 봇.
- 장점: 수집 부담 없음, 호출량이 회원 수와 무관, 취소·지분을 비교에서 제외.
- 단점: 토지·일반 건물 지번 가림, 임대료·호가 없음, 신고 지연, 12개월이 차기까지 비교 표본이 적음.

## 4. 버전
- v1.01 (2026-10-31): 첫 버전. 빌드 2회. 「준비중」, 시험 계정 14일 권한.

## 5. 대기
[`docs/IMPROVEMENT_BACKLOG.md`](docs/IMPROVEMENT_BACKLOG.md)

## 6. 연계 아이디어
[`docs/IMPROVEMENTS.md`](docs/IMPROVEMENTS.md) §3

## 7. UI 제안
[`docs/IMPROVEMENTS.md`](docs/IMPROVEMENTS.md) §2

## 주의
- `vercel env pull`은 민감 변수를 `[SENSITIVE]` 글자로 내려 준다. 다른 프로젝트로 복사하면 안 된다(2026-10-31 사고, 루트 `docs/ERROR_LESSONS.md`).
- 공공데이터 키·예약 호출·1년 보관은 주인님 지정 사항이다(`docs/TOP_RULE_PERSONAL_ACCOUNT_API.md` §8, `docs/SCHEDULER_POLICY.md` §8). 범위를 넓히려면 다시 승인받는다.
- 코드는 `real_estate_sales` 복사본이며 사본 등록 대상 공용 모듈 `telegram-bot-client`를 포함한다.
- 네이버 매물 읽기는 범위 밖, 보류 중: `docs/analysis-naver-realty-collector-20261024/HANDOFF_20261025_BUILDING_LISTING_ALERT.md`.

## 시험
`npm test`(순수 함수 14개), `npx tsc --noEmit`, `npx eslint src`, `npm run build`.
