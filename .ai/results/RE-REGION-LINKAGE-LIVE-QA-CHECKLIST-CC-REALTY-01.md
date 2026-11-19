# 관심 지역 연계 배포 뒤 실화면·RLS 점검표 (RE-REGION-LINKAGE-LIVE-QA-CHECKLIST A1)

- 작성: CC-REALTY-01 Claude(RealEstate), 2026-11-20, 기준 `0c2a9c767`. Master `msg_f8297c15d302`.
- 범위: 관심 지역 3프로그램 연계(실거래 1단계·상가 2단계·매물 알림 3단계)의 **배포 뒤** 확인 절차. 이 문서 작성 중 수집·문자·회원 자료·운영 변경·배포·승인 요청 0.
- 배포 단위·승인은 `.ai/results/RE-RELEASE-BUNDLE-EVIDENCE-CC-REALTY-01.md`(Master 일괄 목록)를 따른다.

## 1. 기존 근거(소스·독립 검수)

| 프로그램 | 화면 | 연계 코드 | 다른 표 읽기 | 독립 검수 | 운영 상태 |
|---|---|---|---|---|---|
| 실거래 `real_estate_sales` | `/districts` 「🔗 다른 부동산 프로그램에 등록한 지역」 | `src/lib/realestate/crossWatch.ts` `suggestFromOtherPrograms` (`a6544db4e`, 보완 `e7084ca24`) | 상가 `commercial_land_watch`(`is_active=true`, 5자리) · 매물 알림 `realty_alert_targets`(`target_type='region'`·`enabled=true`, 10자리 앞 5자리) | `RE-20261119-NEWS-CX-QA-01` e7084ca24 재검수 27/27 | **미배포**(v1.61 운영, v1.62 후보) |
| 상가 `commercial-land-trade-alert` | `/districts` 제안 칸 | `src/lib/crossWatch.ts` (`dab9d80e1`) | 실거래 `real_estate_watch_districts`(`is_active=true`) · 매물 알림(위와 같음) | `RE-20261119-CROSS-COMMERCIAL-CX-QA-01` PASS 3/3 | **운영 중 v1.35(2026-11-19)** |
| 매물 알림 `realty-listing-alert` | `/targets` 지역 고르기 제안 칩 | `lib/crossWatch.ts` `suggestRegionsFromOtherPrograms` (`a6e11f679`) | 실거래·상가(`is_active=true`, 5자리), 본인 활성 10자리 지역 감시가 있는 시군구 제외 | `RE-20261119-CROSS-LISTING-CX-QA-01` PASS 3/3 | **미배포**(v1.46 운영, v1.47 후보) |

공통 구조(코드 확인): 세 화면 모두 `@/lib/supabase/server`의 회원 세션 `createClient()`로 **`user_id` 조건 없이** 다른 표를 `select`한다 → 본인 행만 보이는 근거는 **RLS 하나뿐**이다. 조회 실패는 `.then(r => r, () => ({data:null}))`로 빈 제안이 되어 화면은 그대로다. 자동 등록 없음(제안 → 기존 켜기 버튼·폼 제출로만 쓰기).

저장소 마이그레이션의 RLS(운영과 같은지 아래 2-1에서 확인):
- `real_estate_watch_districts`: `watch_districts_select_own` `for select using (auth.uid() = user_id)` (`real_estate_sales/supabase/migrations/20260810050751_real_estate_sales_init.sql`)
- `commercial_land_watch`: `commercial_land_watch_own` `for all to authenticated using (auth.uid() = user_id)` (`commercial-land-trade-alert/supabase/migrations/20261031010000_commercial_land_init.sql`)
- `realty_alert_targets`: `realty_alert_targets_own` `for all to authenticated using (auth.uid() = user_id)` (`realty-listing-alert/supabase/migrations/20261025000100_realty_alert_tables.sql`)

## 2. 배포 뒤 점검 항목

### 2-1. 운영 RLS 읽기 확인(배포와 무관, 지금도 가능 — 읽기 SQL 1회)
```sql
select tablename, policyname, cmd, roles, qual
from pg_policies
where schemaname='public' and tablename in ('real_estate_watch_districts','commercial_land_watch','realty_alert_targets')
order by tablename, policyname;
select relname, relrowsecurity from pg_class where relname in ('real_estate_watch_districts','commercial_land_watch','realty_alert_targets');
```
- 합격: 세 표 모두 `relrowsecurity = true`, SELECT에 쓰이는 정책의 `qual`이 `(auth.uid() = user_id)`뿐, `anon`·`true` 정책 없음.
- 대상: 운영 DB ref `esgxyikcnnvmlhygjkth` **읽기만**(쓰기 0).

### 2-2. 시험 계정 실화면(배포 단위마다)

계정: 시험 계정 `buylifemall@naver.com`(일반 회원 권한, 로그인은 주인님 직접). 브라우저: ego lite, 작업 공간 하나, 끝나면 `finish({keep:[]})`. 관리자 계정으로 대신 확인하지 않는다(관리자는 RLS를 우회하지 않지만 결과 해석이 섞임).

준비 상태 기록(읽기만, 회원 본인 자료를 바꾸지 않음): 시험 계정이 이미 켜 둔 실거래 지역·상가 지역·매물 알림 지역 감시를 화면에서 먼저 적어 둔다. **시험을 위해 지역을 켜거나 끄지 않는다** — 기대값이 비면 「제안 없음」 안내가 맞게 나오는지만 본다.

| # | 프로그램(버전) | 확인 | 합격 기준 |
|---|---|---|---|
| A1 | 상가 v1.35(지금 가능) | `/districts` 제안 칸 | 시험 계정의 켜진 실거래 시군구·활성 매물 알림 지역 시군구 중 상가에 없는 것만 보임. 이미 켠 상가 지역·꺼진 감시는 안 보임. 출처 라벨(실거래/매물 알림) 맞음 |
| A2 | 상가 | 제안 클릭 | 기존 켜기 흐름으로만 이어지고 클릭만으로 자동 등록되지 않음(실제 저장 버튼은 누르지 않음) |
| B1 | 실거래 v1.62 | `/districts` 「🔗 다른 부동산 프로그램에 등록한 지역」 | 상가 `is_active`·매물 알림 활성 지역 시군구 중 실거래에 없는 것만. 같은 시군구 중복 1줄 |
| B2 | 실거래 | 화면 버전 표기·메인 상세 | `v1.62`, DB `programs.version` 같음 |
| C1 | 매물 알림 v1.47 | `/targets` 지역 고르기 제안 칩 | 실거래·상가 켜진 시군구 중 본인 활성 동 감시가 없는 것만. 칩 선택 시 시·도·시군구만 채워지고 동 선택은 비워짐 |
| C2 | 매물 알림 | 저장 흐름 | 동(10자리)을 고른 뒤 기존 폼 제출로만 저장(시험에서는 제출하지 않음) |
| C3 | 매물 알림 확장 버전 | `node scripts/check-extension-release.mjs realty-listing-alert` | `OK` — manifest·ZIP·DB `extension_version` v1.47 일치(확장 코드 변경은 없지만 원칙 10에 따라 버전은 맞춤). 회원 확장은 다시 받을 필요 없음 안내 |
| X1 | 공통 소유권 | 화면 제안 목록 ↔ 2-1 SQL의 시험 계정 행(`user_id` = 시험 계정) 대조 | 제안 시군구가 모두 시험 계정 본인 행에서 나옴. 다른 회원 지역이 하나라도 보이면 즉시 중단 |

### 2-3. 증거
- 화면 캡처(프로그램별 1장), 2-1 SQL 결과, `check-extension-release` 출력. 회원 지역 이름은 시험 계정 것만 기록.

## 3. 중단·복구 기준

| 상황 | 판단 | 조치 |
|---|---|---|
| 다른 회원의 지역이 제안에 보임(X1 실패) 또는 2-1에서 RLS 꺼짐·`true` 정책 | **즉시 중단(개인정보)** | 그 프로그램 직전 Ready 배포로 Vercel 되돌리기(주인님 승인), 주인님·Master 보고. 정책 수정은 DB 변경이라 별도 승인 |
| 제안 칸이 비는데 기대값이 있음 | 기능 결함(보안 아님) | 배포 유지, 원인(표 이름·조건) 조사 후 다음 미배포 묶음 |
| 클릭만으로 저장됨(A2·C2) | 회원 의사와 다른 쓰기 | 즉시 중단·되돌리기 |
| 화면 500·로그인 튕김 | 배포 결함 | 되돌리기, `vercel logs` 원인 확인 |
| 확장 버전 불일치(C3) | 운영 기록 불일치 | 버전 SQL·ZIP만 다시 맞춤(빌드 없음), 회원 영향 없음 |

## 4. 남은 일
- 2-1·A1은 상가가 이미 운영 중이라 배포 승인 없이도 할 수 있으나, 시험 계정 로그인(주인님)과 운영 DB 읽기 SQL 1회가 필요 — 실행 여부는 Master 일괄 목록에서 결정.
- B·C는 각 배포(v1.62·v1.47) 승인·Ready 뒤.
