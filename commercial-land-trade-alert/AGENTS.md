# 상가·건물·토지 매물 알림 (`commercial-land-trade-alert`)

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
- v1.02 (2026-10-31): 네이버 매물 1단계. 감시 화면, 예약, 가격 변동 비교, 텔레그램/이메일/카카오톡 알림과 파일, 실거래 알림도 3채널, 이름 변경. 플랜 `docs/PLAN_20261031_NAVER_LISTINGS.md`. 검수: 시험 25개, 타입, 린트, 빌드, ZIP·DB 대조, 웹 화면·390px. 실제 네이버 수집·3채널 발송은 주인님 실물 시험 대기. 2·3단계(시세 대비, 후보 점수, 수익률, AI)와 결과 화면, 중개사 번호는 아직 없음.
- v1.01 (2026-10-31): 첫 버전. 빌드 3회. 2026-10-31 정식 공개, VIP 145명 등급 부여(일반·골드 제외), 시험 계정 14일 권한. 부동산 시리즈 디자인 + 전용 로고.
- 검수: 강남구 원본 대조(상업 200, 토지 470 일치, 7월 채움 뒤 275·512), 재수집 중복 없음, 시험 줄 복구, 알림 전송 기록 1건, CSV 470줄, 390px 가로 넘침 없음. 토지 지분이 강남에서 453/470으로 많아 기본 목록이 적게 보일 수 있다.

## 5. 대기
[`docs/IMPROVEMENT_BACKLOG.md`](docs/IMPROVEMENT_BACKLOG.md)

## 6. 연계 아이디어
[`docs/IMPROVEMENTS.md`](docs/IMPROVEMENTS.md) §3

## 7. UI 제안
[`docs/IMPROVEMENTS.md`](docs/IMPROVEMENTS.md) §2

## 주의
- 확장 수집은 회원이 저장한 네이버 화면을 열어 페이지가 받은 목록 응답만 읽는다. 직접 호출·상세 조회·중개사 번호는 하지 않는다(v1.02).
- `vercel env pull`은 민감 변수를 `[SENSITIVE]` 글자로 내려 준다. 다른 프로젝트로 복사하면 안 된다(2026-10-31 사고, 루트 `docs/ERROR_LESSONS.md`).
- 공공데이터 키·예약 호출·1년 보관은 주인님 지정 사항이다(`docs/TOP_RULE_PERSONAL_ACCOUNT_API.md` §8, `docs/SCHEDULER_POLICY.md` §8). 범위를 넓히려면 다시 승인받는다.
- 코드는 `real_estate_sales` 복사본이며 사본 등록 대상 공용 모듈 `telegram-bot-client`를 포함한다.
- 네이버 매물 읽기는 범위 밖, 보류 중: `docs/analysis-naver-realty-collector-20261024/HANDOFF_20261025_BUILDING_LISTING_ALERT.md`.

## 시험
`npm test`(순수 함수 14개), `npx tsc --noEmit`, `npx eslint src`, `npm run build`.
