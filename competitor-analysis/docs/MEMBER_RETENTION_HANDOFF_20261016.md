# 회원별 생성 데이터 격리·30일 자동삭제 인수인계

2026-10-16 Codex(Windows) · 서비스: https://competitor-analysis.buylife.xyz

## 현재 상태 — 다음 CLI가 먼저 읽을 것

**정책 확정, 후보 v1.08 코드·SQL 검수 완료, 운영 적용 승인 대기. 운영은 v1.07입니다.** 운영 DB 변경·만료 데이터 영구삭제·프로덕션 배포를 아직 실행하지 않았습니다. 사용자에게 정확한 범위를 제시하고 승인을 요청했습니다. 응답이 없다는 이유로 승인으로 간주하지 않습니다.

근거: 루트 AGENTS.md §2 및 이 프로그램 AGENTS.md 「사전 승인 필수 작업」은 DB 스키마·RLS 변경과 데이터 삭제의 사전 승인을 요구합니다. 기능 수정·빌드·검사·문서화는 완료했습니다. DB가 준비되기 전에 후보 앱을 배포하면 새 테이블 조회가 실패하므로 먼저 배포하지 않습니다.

## 주인님 확정 원칙

- 회원은 자신의 계정·자신의 API 키를 연결하고, 그 API로 만든 데이터도 그 회원만 사용합니다. 공개 회사정보·비용 절감도 공유 예외가 아닙니다. **관리자 승인형 공유 캐시 제안은 폐기**됐습니다.
- 생성·수집·분석 자료와 개인 캐시는 생성일 기준 **30일 후 자동삭제**합니다. 재조회나 리포트 서식 변경으로 기한을 연장하지 않습니다.
- 공통 Supabase 프로젝트는 그대로 유지합니다. 회원별 행 소유자·RLS로 구분하며 별도 Supabase 프로젝트를 회원마다 만들지 않습니다.
- 계정·API 키·권한·결제·키워드 정의·추적 선택·연동 설정은 생성 결과와 구분합니다.

루트 AGENTS.md·CLAUDE.md·GEMINI.md, docs/TOP_RULE_PERSONAL_ACCOUNT_API.md §0, docs/DATABASE_CONNECTION_POLICY.md에도 반영했습니다. 초기 전역 캐시를 정당화한 프로그램 문서는 정정했습니다. 과거 완료 보고는 당시 v1.07 기록이며 이 항목이 우선합니다.

## 후보 코드와 DB 전환안

SQL: `supabase/migrations/20261016115339_member_owned_generated_data_retention.sql` (Supabase CLI migration new로 생성).

1. 새 `competitor_company_profiles`는 user_id·created_at 필수, 회원별 조회/입력/삭제 RLS, 만료 즉시 조회 차단입니다. 회원에게 UPDATE 권한을 주지 않습니다. 같은 도메인을 A/B가 각자 조사해도 독립 저장합니다.
2. 본인 최신 조사 중 30일 이내 자료만 사용합니다. 만료·타인 자료는 본인 API로 재조사합니다. 조회 오류를 빈 캐시로 간주해 추가 유료 조사를 실행하지 않습니다. 외부 서비스 호출은 기존처럼 본인 키 없으면 안내하고 종료합니다.
3. 소유자 없는 옛 `competitor_profiles`는 회원 권한·정책을 제거합니다. 소유자 추정·일괄 복사·회원 간 자료 이전은 없습니다. 원본 과거 마이그레이션 0001은 이력으로 유지합니다.
4. 분석 회차/검색결과/리포트에도 RLS 기한 제한, 자식 INSERT에는 본인 회차·키워드 확인을 추가합니다. HTML 갱신은 본인·유효기간을 재확인하고, 실행 중 만료돼 0행 갱신이면 실패를 안내합니다.
5. DB가 생성일을 확정하며 회원이 미래 생성일을 보내도 기한이 늘어나지 않습니다. 새 결과·리포트는 회차 생성일을 상속합니다. 기존 회차의 자식 자료도 그 회차와 함께 삭제합니다.
6. `cleanup_competitor_generated_data()`는 SECURITY INVOKER·고정 search_path이며 postgres Cron만 실행합니다. PUBLIC/anon/authenticated/service_role에는 실행 권한이 없습니다. 해당 프로그램 생성 테이블 5개만 정리하고 설정/키/다른 프로그램/Storage는 건드리지 않습니다.
7. Cron `competitor-generated-data-retention-30d`: UTC 매시 07분(`7 * * * *`). 30일 시점부터 조회 차단, 물리 삭제는 정상 실행 시 최대 약 1시간 뒤입니다. 장애 시 지연되므로 `cron.job_run_details`를 확인해야 합니다. 새 환경변수·키 변경은 없습니다.

## 운영 영향 실측 — 아직 삭제 안 함

| 테이블 | 현재 행 | 30일 경과 | 처리 |
|---|---:|---:|---|
| competitor_profiles | 2 | 2 | 일반 회원 접근 차단, 만료 삭제 |
| competitor_serp_jobs | 2 | 2 | 만료 회차 삭제 |
| competitor_serp_results | 38 | 38 | 만료 검색결과 삭제 |
| competitor_analyses | 2 | 2 | 만료 리포트 삭제 |
| competitor_keywords | 7 | 해당 없음 | 유지 |
| user_tracked_competitors | 2 | 해당 없음 | 유지 |

합계 생성 자료 44행입니다(2+2+38+2). 같은 회차의 자식은 집계에 이미 포함돼 있으므로 CASCADE 수를 중복 계산하지 않습니다. API 키·회원·권한·결제 자료는 삭제 대상이 아닙니다. 실행 직전 다시 실측합니다.

## 검수 결과와 증거

- `npm run build:verify`: Next 컴파일·타입 검사 포함 통과. 기존 루트 DB 연결을 자식 프로세스에만 전달했고 env 파일/운영 키는 변경하지 않았습니다.
- `npm run test:browser`: 실제 컴포넌트/서버 페이지 + 합성 자료/액션 15개 통과. 보이는 Microsoft Edge 1440px/375px, 표 스크롤·클립보드·HTML sandbox 포함. 증거 `docs/evidence/retention-v108-browser-fixtures.json`, `retention-v108-fixture-desktop.png`, `retention-v108-fixture-mobile.png`.
- `npm run test:retention`: 실제 서버 액션 + DB/외부 제공자 경계 모의 7개 통과. 타인/만료 자료 재사용 금지, 소유자/기한 조건, 본인 최신 자료 사용, 리포트 실행 중 만료, 본인 키 누락 검사. 증거 `docs/evidence/member-retention-actions.json`.
- Supabase SQL 실검사: **단일 BEGIN → 후보 마이그레이션 → `supabase/tests/member_retention.sql` → ROLLBACK** 통과. A/B 동시 도메인 격리, 30일 직전/정각/직후, 타인 INSERT/DELETE·회차 연결 차단, 익명 접근·전역 정리 호출 차단, 미래 생성일 변조 차단, 본인 HTML 갱신 허용, 만료 삭제·설정/키 보존·Cron 등록을 검증했습니다. 테스트 중 삭제·DDL·권한·Cron·합성 자료는 모두 롤백했습니다.
- 롤백 후 재조회: 신규 테이블/Cron 없음, 기존 생성 자료 2/2/38/2와 설정 7/2, DB 프로그램 v1.07 그대로입니다. 실제 외부 유료 API 호출 0회입니다.
- 실제 일반 회원 Edge 로컬 검사 결과는 `docs/evidence/retention-v108-runtime-local.json`을 확인합니다. 시험 회원은 생성 데이터가 없는 계정이므로 이 검사를 새 운영 RLS/유료 분석 성공 증거로 사용하지 않습니다. 운영 v1.08 검수는 미실시입니다.

## 승인 후 다음 첫 단계

1. 최신 루트 지침·이 문서·ACTIVE_WORK·git 상태를 확인하고 프로그램 예약 줄을 추가합니다. 사용자 승인 응답을 확인합니다(승인 범위: 이 프로그램 회원 격리 스키마/RLS, 30일 정리·위 만료 자료 삭제, v1.08 배포).
2. 운영 건수·기한·새 회원 작업 유무를 다시 확인합니다. migration SQL을 적용해 새 저장소와 차단 정책/Cron을 만듭니다. 기존 공유 테이블 재개방을 롤백 수단으로 사용하지 않습니다.
3. 검수 소스의 고정 커밋을 커밋·푸시 후 이 프로그램만 프로덕션 배포합니다. 기존 회원 공유 테이블 의존 코드는 새 버전으로 교체되므로 DB 적용~배포 간 짧은 쓰기 중단을 고려합니다. 배포 실패 시 원인을 복구하되 공유 자료 접근을 다시 열지 않습니다.
4. postgres로 `select public.cleanup_competitor_generated_data();`를 실행해 승인된 만료 자료만 정리하고 남은 건수를 대조합니다. 삭제는 영구적이므로 사용자가 승인한 범위를 넘어 확장하지 않습니다.
5. 회원 권한·Cron/정리 결과·익명/타인/만료 차단을 확인합니다. 실데이터 RLS 검사 시 테스트용 트랜잭션은 항상 롤백합니다. 유료 분석 실행은 별도 승인 없이 하지 않습니다.
6. `programs.version='v1.08' where slug='competitor-analysis'` DML, 코드 APP_VERSION v1.08 일치, 라이브 Edge 1440/375px 검사, 현황판 50번·#12 상태·이 문서·README/AGENTS·root HANDOFF를 실제 결과로 갱신합니다. 작업 예약 줄을 제거하고 커밋·푸시합니다.
7. 루트 Git 자동배포의 설치 파일 누락 회귀 방지: 최종 푸시 뒤 `node scripts/finalize-supabase-compat-main.cjs`. 최신 검증 기준은 deployments.json이며 root 런타임이 바뀌었다면 과거 배포 승격 금지, 최신 루트+설치 파일 배포 절차를 따릅니다.

남은 별도 개선: #11 Next 14 의존성 보안 업그레이드. 다른 프로그램의 30일 삭제 적용 여부는 아직 전수 검수하지 않았습니다. 전 프로그램 적용 완료로 보고하지 않습니다.
