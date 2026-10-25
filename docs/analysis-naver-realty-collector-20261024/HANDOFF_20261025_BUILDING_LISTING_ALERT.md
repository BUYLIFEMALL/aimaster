# 인수인계 — 건물 매물 알림(새 프로그램) · ⏸ 보류 중 (2026-10-25)

> **상태: 보류** — 주인님 지시(2026-10-25) 「건물 작업은 이후에 할꺼야 지금 플랜 짠 것 그때 이어서 할 수 있도록 인수인계 문서로 남겨놔」.
> 다시 시작하라는 주인님 지시가 있을 때까지 코드·폴더·DB·Vercel 프로젝트를 만들지 않는다.
> 작성: [역할: realty] Claude Code(윈도우) `claude-win-20261024-realty`

## 1. 무엇을 하기로 했나 (주인님 결정)
- 2026-10-25: 「기존 아파트 프로그램은 이대로 계속 개발 업그레이드하고, 별도의 프로그램으로 **건물 → 상가 → 토지** 순으로 개발해 보고, 나중에 가능하다면 하나로 합치는 방식으로 개발 난이도를 낮추어 진행」
- 첫 프로그램은 **건물**. 상가·토지는 건물이 안정된 뒤 같은 순서로.
- 아파트 프로그램(`realty-listing-alert`)은 그대로 계속 업그레이드한다(이 문서와 별개).

## 2. 지금까지 한 것
| 항목 | 상태 | 위치 |
|---|---|---|
| 개발 플랜(목적·아파트와 다른 점·재사용 컴포넌트·새로 만들 것·단계·비용·이름 후보·검수) | ✅ 작성(주인님 검토 전 보류) | [`PLAN_20261025_BUILDING_LISTING_ALERT.md`](PLAN_20261025_BUILDING_LISTING_ALERT.md) |
| 작업 대기 백로그 | ✅ 올림 | [`realty-listing-alert/docs/IMPROVEMENT_BACKLOG.md`](../../realty-listing-alert/docs/IMPROVEMENT_BACKLOG.md) 「새 프로그램 — 건물 → 상가 → 토지」 |
| 공통 아이디어 표 | ✅ IDEA-REALTY-04(채택·보류) | [`docs/PROGRAM_IDEA_BACKLOG.md`](../PROGRAM_IDEA_BACKLOG.md) |
| 결정 기록 | ✅ | [`realty-listing-alert/docs/IMPROVEMENTS.md`](../../realty-listing-alert/docs/IMPROVEMENTS.md) §6 · 역할 파일 [`docs/roles/realty.md`](../roles/realty.md) 「대기 중」 |
| 코드·폴더·DB·Vercel·도메인·`programs` 등록 | ❌ 하지 않음(보류) | — |

## 3. 다시 시작할 때 주인님께 먼저 여쭐 것
1. **이름** — 플랜 §7 추천 1번 「부동산 건물 매물 알림」 `realty-building-alert`(상가·토지가 「부동산 상가 매물 알림」 「부동산 토지 매물 알림」으로 이어져 나중에 합치기 쉬움). 나머지 후보: 꼬마빌딩 매물 알림 `small-building-alert` · 건물 매매 실시간 알림 `building-listing-alert` · 수익형 건물 매물 알림 `income-building-alert` · AI 건물 매물 레이더 `building-listing-radar`. 시작 전 slug·폴더가 겹치지 않는지 다시 확인.
2. **0단계 사전 검증 시작**(비용 없음) — 아래 4절.
3. 1단계부터 빌드 비용(플랜 §6, 총 5~8회)은 단계마다 다시 승인.

## 4. 다음 첫 단계 (재개 순서)
1. 이 문서와 플랜, `realty-listing-alert/AGENTS.md`(지금 버전·컴포넌트 위치), [`docs/EXTERNAL_PROGRAM_ANALYSIS_REGISTRY.md`](../EXTERNAL_PROGRAM_ANALYSIS_REGISTRY.md) EXT-RE-01, [`docs/PLATFORM_PATTERNS.md`](../PLATFORM_PATTERNS.md) §20(봇 탐지 회피)을 먼저 읽는다.
2. **0단계 사전 검증 페이지**(저장소 밖 임시 폴더, 내 PC 전용 주소): 아파트 프로그램과 같은 원칙 — 회원 PC·회원 본인 로그인·회원이 보는 화면이 불러온 내용만 읽기·하루 상한·차단 화면이면 멈춤 — 으로 건물 매물을 읽을 수 있는지, **네이버 이용 조건과 부딪히지 않는지** 점검하고 결과를 주인님께 보고(코드 결과는 이 폴더에 `PREVALIDATION_YYYYMMDD_BUILDING.md`로, 사전 검증 페이지는 확인 뒤 지움).
3. 주인님 승인 뒤 플랜 §5의 1단계(등록·뼈대, 「준비중」)부터.

## 5. 설계 요점 (플랜 요약 — 자세한 것은 플랜)
- **감시 단위는 지역(시·구·동)** — 건물은 단지가 없다. 아파트 v1.05의 지역 고르기 화면 재사용.
- **조건**: 가격·대지면적·연면적·용도·사용승인 연도.
- **통계·급매**: 같은 동·같은 용도의 연면적 평당가 중간값 기준(아파트 `extension/lib/bargain.js`·`lib/resultSort.ts` 방식을 건물 칸에 맞춰 바꿈).
- **실거래 비교**: 국토부 「상업업무용 부동산 매매」 자료 — 공공데이터포털 활용신청이 **서비스마다 따로**라 화면에 신청 링크·403 안내를 처음부터 넣는다(아파트 v1.27에서 잘못된 신청 링크 15057532로 403이 났던 사례, `docs/ERROR_LESSONS.md` 확인).
- **엑셀 칸**: 맨 끝에만 새 칸을 붙인다(변동 기록이 예전 칸 순서로 저장된 줄을 읽기 때문 — 아파트 v1.28 「급매」 칸 사례).
- **그대로 가져다 쓸 컴포넌트**(아파트 프로그램 기준): 표준 로그인·권한 `lib/access.ts`, 좌측 메뉴, 설정 표 `app/settings/SetupTable.tsx`, AI 엔진 두 줄 `AiEngineRow`(`app/delivery/DeliveryClient.tsx`)·`lib/aiModels.ts`, 받는 곳 연결(회원 공용 연동값 재사용), 확장 `web-bridge`·예약·하루 상한·엑셀(`extension/lib/sheet.js`)·알림(`telegram.js`·`notify.js`)·AI 요약(`aiSummary.js`)·통계(`stats.js`), 결과 화면(`app/dashboard/RecentResults.tsx`·`app/results/StatsDashboard.tsx`)·오늘 사용량(`app/dashboard/DailyUsage.tsx`).
- **원칙**(아파트와 같음): 네이버 접속은 회원 PC·회원 본인 로그인으로만, 우리 서버는 네이버에 요청하지 않고 매물을 저장하지 않음, 회원 본인 키·계정, 하루 상한·차단 화면이면 그날 멈춤(우회 금지).

## 6. 나중에 하나로 합칠 때를 위한 메모
- 세 프로그램은 같은 이름 계열·같은 컴포넌트·같은 회원 연동값을 써서, 합칠 때 「매물 종류」 고르기 하나로 묶을 수 있게 만든다(감시 대상 표에 종류 칸을 처음부터 두는 것을 검토).
- 합치기는 세 프로그램이 각각 안정된 뒤 주인님 결정으로 — 프로그램 비교 분석 매뉴얼(`docs/PROGRAM_COMPARISON_ANALYSIS_GUIDE.md`) 순서를 따른다.
