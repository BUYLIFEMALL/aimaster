# 개발 플랜 — 비주거 실거래 확대: 공장·창고 추가 (v1.31)

상태: 승인(「진행해」)·v1.31 배포 완료(2026-11-04). 수집은 회원 선택과 상관없이 지역마다 함께 받는 쪽으로 단순화(§3의 「회원이 고른 종류만 호출」 대신 — 호출 수가 지역당 하루 2~3건이라 한도 영향 없음).
작성: [역할: realty] Claude Code(윈도우) `claude-win-realty-docs`
근거: 주인님 「비주거 실거래 확대 이거부터해」(2026-11-04). 공공 실거래 15종 모두 승인(`real_estate_sales/docs/REVIEW_20261031_DATA_SCOPE.md`).

## 1. 현재와 빈칸
| 국토부 자료 | 서비스 | 지금 쓰는 곳 |
|---|---|---|
| 상업업무용 매매 15126463 | `NrgTrade` | 이 프로그램 「건물」 |
| 토지 매매 15126466 | `LandTrade` | 이 프로그램 「토지」 |
| **공장·창고 등 매매 15126470** | **`InduTrade`** | **없음 → 이번에 추가** |
| 분양권 전매 15126471 | `SilvTrade` | 없음(주거 자료라 이번 범위 아님, 실거래 프로그램 후보로 따로) |

비주거 매매 자료 중 남은 것은 공장·창고 하나다. 새 프로그램을 만들지 않고 이 프로그램에 세 번째 종류로 넣는다(같은 지역·조건·알림·비교를 그대로 씀).

## 2. 범위
1. 종류 `factory`(화면 「공장·창고」) 추가: 수집·저장·목록 거르기·조건 화면·알림 문구·통계 대시보드·CSV.
2. 응답 해석은 건물(`NrgTrade`)과 같은 칸 이름을 가정한다(`buildingAr`·`buildingUse`·`plottageAr`·`buildingType`·`floor`·`buildYear`·`landUse`·`shareDealingType`·`cdealType`·`dealingGbn`). 공식 페이지에 세부 칸이 없어(2026-11-04 확인) 배포 뒤 첫 수집 원본과 대조하고, 다른 이름이면 그 자리에서 고친다. 칸이 비어도 줄은 저장한다(면적 없으면 평당가만 비움).
3. 시세 비교: 같은 동·같은 종류·같은 용도 평당가 중간값(5건 미만 표시 안 함) — 건물과 섞지 않는다.
4. 기본값: 기존 회원의 감시 종류에는 자동으로 켜지 않는다(알림 폭주 방지, 기존 「기본값은 좁게」). 조건 화면에서 체크하면 켜진다. 안내 한 줄.
5. 하지 않는 것: 네이버 매물 쪽 공장·창고 읽기, AI 분석 추가, 분양권.

## 3. 바꿀 파일
- `src/lib/trades/parse.ts` — `TradeKind`에 `factory`, 건물과 같은 해석 경로.
- `src/lib/trades/collect.ts` — `SERVICE.factory = "InduTrade"`, 회원이 고른 종류만 호출(호출 수 절약), 사용량 기록 종류별.
- `src/lib/trades/prefs.ts`·`market.ts`·`query.ts`, `ConditionsForm.tsx`, `trades/page.tsx`, `StatsDashboard.tsx`, `actions/watch.ts` — 라벨·거르기·비교.
- 시험 `tests/` — 공장·창고 해석·키·라벨.
- DB `supabase/migrations/20261104020000_factory_kind.sql` — `commercial_land_trades.kind` 제약에 `factory` 추가(추가만, 기존 줄 그대로).

## 4. 검수
1. 로컬: 시험·`tsc`·`npm run build`.
2. DB 제약 SQL 적용(ego lite SQL 편집기) → **바로 이어서 배포**(고객관리 v1.09 교훈: DB와 배포 사이 틈을 두지 않음. 이번 SQL은 추가만이라 옛 화면도 깨지지 않음).
3. 운영: 시험 계정 조건 화면에서 공장·창고 켜기 → 관리자 수집 1회(시험 지역, 예: 화성·평택·김포) → 원본 칸 대조, 줄 수, 다시 수집해도 안 늘어나는지, 목록·통계·390px 화면(ego lite).
4. 문서: AGENTS.md·IMPROVEMENTS·프로그램 비교표 카드·카테고리 지도·작업표·역할 파일.

## 5. 비용
| 항목 | 내용 | 금액 |
|---|---|---|
| Vercel 빌드 | 1회(문제가 나오면 +1회까지) | 팀 요금 안 |
| DB SQL | 제약 변경 1건(운영 DB `esgxyikcnnvmlhygjkth`) | 없음 |
| 공공데이터 호출 | 공용 키, 지역당 하루 2건 늘어남(한도 10,000) | 무료 |
| AI 호출 | 없음 | 없음 |
| 회원 부담 | 없음 | 없음 |

## 6. 버전
`commercial-land-trade-alert` v1.30 → v1.31. 미배포 대기 없음(같이 나갈 것 없음).
