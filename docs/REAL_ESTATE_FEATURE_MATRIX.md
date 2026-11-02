# 부동산 기능 상세 비교표 (기준 문서)

> **상태: 담당 확인(2026-11-02, [역할: realty] `claude-win-realty-docs`, RQ-0).** 2026-10-24 초안(claude-win-dotori)의 칸을 v1.37 코드와 대조해 고쳤다. 아파트 호가(`realty-listing-alert`)와 상가·건물·토지(`commercial-land-trade-alert`)는 각자 `AGENTS.md`와 [프로그램 비교표](PROGRAM_CAPABILITY_MAP.md) 카드를 기준으로 하고, 이 문서는 실거래(`real-estate-sales`) 기능 표다.

> **부동산 프로그램(실거래·시세·매물·지역 분석)을 새로 만들거나 기능을 추가·확장하기 전에 이 문서를 먼저 읽는다.**
>
> - 대상: ① AIMaster 운영(DB ref `esgxyikcnnvmlhygjkth`) — [카테고리 지침 지도](CATEGORY_GUIDE_MAP.md) 「부동산」 줄의 `real-estate-sales`(폴더 `real_estate_sales/`). 비교 대상으로 외부 원본 EXT-RE-01(네이버 부동산 아파트 매물 수집기 Ver1.3)을 함께 적는다.
> - 기준 시점: **2026-11-02**, 코드 버전 **v1.37**(처음 작성 2026-10-24 v1.18)(`real_estate_sales/src/lib/version.ts`).
> - 근거: 현재 코드(파일 검색), `AGENTS.md`·`docs/IMPROVEMENTS.md`·`README.md`, [매물 수집기 분석 보고서](analysis-naver-realty-collector-20261024/REPORT.md), [외부 프로그램 개발분석표](EXTERNAL_PROGRAM_ANALYSIS_REGISTRY.md) EXT-RE-01, [최상위 규칙 문서](TOP_RULE_PERSONAL_ACCOUNT_API.md) §8. **운영 DB와 실제 화면은 이번에 확인하지 않았다.**
> - 프로그램이 1개라 **「기능 × 구현 상태·근거」** 표로 쓴다. 외부 원본 칸은 우리 코드가 아니라 분석 결과다. 이 문서는 사실만 적고 계획은 §6에 둔다.
> - 관계 문서: [부동산 자동화 완성 기준](REAL_ESTATE_COMPLETION_POLICY.md) · [부동산 통합 작업표](REAL_ESTATE_CONSOLIDATION_TASKS.md).

## 0. 이 문서를 쓰는 법

1. **개발 전:** §2에서 기능이 이미 있는지 찾고 §4 기준 코드를 가져다 쓴다.
2. **수집 원천 판단:** 공식 공공 API만 쓴다. 공식 API가 없는 데이터는 [완성 기준](REAL_ESTATE_COMPLETION_POLICY.md) §5를 먼저 본다.
3. **개발 후(같은 커밋):** 바뀐 칸·버전을 §2에서 고치고 §7에 이력 한 줄. 배포 전 기능은 §6 「미배포 대기」에.
4. 공용 문서라 `node scripts/safe-commit.mjs --begin docs/REAL_ESTATE_FEATURE_MATRIX.md --as <세션>` → 수정 → `node scripts/safe-commit.mjs "<메시지>" docs/REAL_ESTATE_FEATURE_MATRIX.md --as <세션>`.

## 1. 프로그램 정의·장단점

| 약칭 | 프로그램 | 역할 | 핵심 흐름 | 저장 / AI / 키 | 장점 | 단점·한계 |
|---|---|---|---|---|---|---|
| 실거래 | 부동산 실거래 투자분석 자동화 (`real-estate-sales` v1.37, 스마트 매트릭스 다크 슬레이트) | 전국 관심 지역 새 실거래(매매·전세·월세, 아파트·빌라·오피스텔) 알림 + AI 투자 분석 + 임장 노트 | 시·군·구 선택 → 공공 API 정기 수집(5분 확인·회원 주기·시간대) → 회원별 새 거래 → 버튼으로 AI 분석(저평가 지수·상승예측률·매력 점수) → 텔레그램·알림톡 | 공용 원천 `real_estate_listings` + 회원별 표 / OpenAI·Claude·Gemini 분석, Perplexity 지역 분위기 / AI는 회원 키, 공공 데이터는 운영자 공용 키(예외) + 회원 키 선택 | 공식 공공 데이터만, 열람만으로 과금 없음, 1분 중복 분석 차단, 알림 AI 분석 켜기/끄기, 서울 icn1 리전 | 지역·회차당 새 거래 20건 상한, 현재 매물(호가)은 매물 알림 프로그램 몫, 연립 매매(RHTrade) 403 해소 대기, 브이월드 배경지도 하루 한도 관찰 중 |
| (외부) 수집기 | 네이버 부동산 아파트 매물 수집기 Ver1.3 (EXT-RE-01, PyInstaller EXE) | 단지 현재 매물·중개사 → 엑셀 | 회원이 쿠키·curl 붙여넣기 → 비공식 내부 주소 반복 호출 → 엑셀, 1분 자동 | 로컬 pickle / AI 없음 | 현재 호가·중개사 정보 | 비공식 수집(차단·약관·권리 위험), 회원 쿠키 취급 — **하지 않기로 함(N4)** |

## 2. 기능 상세 비교표

○ 있음 · △ 일부 · × 없음 · 「미확인」은 코드를 확인하지 못한 칸. 경로는 `real_estate_sales/` 기준.

### 2-1. 데이터 수집

| 기능 | 실거래(우리) | 수집기(외부, 분석 결과) |
|---|---|---|
| 서울 아파트 실거래 수집(서울 열린데이터) | ○ `src/lib/publicdata/client.ts` `fetchSeoulTrades` | × |
| 전월세 비교 자료 | ○ `fetchSeoulRentComparables` | × |
| 건축물대장(공공데이터포털) | ○ `fetchBuildingRegister` | × |
| 공시가격·공시지가·토지이용(브이월드) | ○ `fetchApartAssessedPrice`·`fetchLandPrice`·`fetchLandUsePlan` | × |
| 서울 외 지역 | ○ 전국 시·군·구 256곳(v1.31, `scripts/build-national-regions.mjs`로 생성) — 서울 밖은 국토부 `AptTrade`·`RHTrade`·`OffiTrade`(`src/lib/publicdata/molit.ts`) | 단지번호 입력(전국) |
| 전세·월세 거래 | ○ v1.33, 국토부 전월세 3종(`AptRent`·`RHRent`·`OffiRent`), 회원이 받을 거래 종류 선택 | × |
| 현재 매물(호가)·중개사 | × | ○ 비공식 내부 주소 — 우리는 하지 않음(N4) |
| 공통 원천 1회 수집을 회원이 함께 사용 | ○ `real_estate_listings`(전역 `dedup_key`), `src/lib/realestate/collect.ts` | × |
| 회원 본인 공공 키(선택) → 없으면 공용 키 | ○ `src/lib/publicdata/memberKeys.ts`, 설정 「공공데이터 키 (선택)」 | 해당 없음 |
| 서울 리전 고정(공공 API 국내 IP) | ○ `vercel.json` `regions: ["icn1"]` | 해당 없음 |

### 2-2. 회원별 화면·분석

| 기능 | 실거래(우리) | 수집기(외부) |
|---|---|---|
| 관심 자치구 켜기/끄기 | ○ `src/components/districts/DistrictToggle.tsx` | × |
| 실거래 목록 검색·자치구·정렬·표/카드 | ○ `src/components/listings/ListingMatrix.tsx`(v1.11) | × |
| 목록 페이지 나눔 | ○ 한 쪽 50건씩 쪽 나눔(`src/app/(dashboard)/listings/page.tsx` `PAGE_SIZE`·`range`) | × |
| 엑셀·CSV 내보내기 | ○ CSV(`src/components/listings/ListingMatrix.tsx`) | ○ 엑셀 |
| 네이버 부동산 단지 바로가기 | ○ 상세 화면 네이버 부동산 검색 링크, 「🔔 이 단지 새 매물 알림 받기」(매물 알림 프로그램으로, v1.19) — `src/app/(dashboard)/listings/[id]/page.tsx` | 해당 없음 |
| AI 투자 분석(버튼으로만) | ○ `src/components/listings/ReanalyzeButton.tsx`, `src/lib/actions/analysis.ts`(v1.13) | × |
| 같은 매물 1분 안 중복 분석 차단 | ○ `analysis.ts` 60초 조회 | 해당 없음 |
| AI 키 회원 본인 것만(폴백 없음) | ○ `src/lib/apiKeys.ts` `resolveApiKey` | 해당 없음 |
| 지역 분위기(Perplexity) 회원별 저장 | ○ `src/lib/ai/sentiment.ts`, 마이그레이션 `20261017_district_sentiment_per_user_v1_12.sql` | × |
| 프롬프트에 오늘 날짜(당해 연도) | ○ 지역 분위기(`sentiment.ts`)·매물 분석(`src/lib/ai/analyze.ts` `currentYear`) | 해당 없음 |
| AI 추정·투자 책임 안내 | ○ `src/app/(dashboard)/listings/[id]/page.tsx` 149행, `/guide` 123행 | × |
| 「안 본 새 실거래」 열람 시 줄어듦 | ○ 열어 본 새 실거래는 「확인됨」(RE-B2, `listings/[id]/page.tsx`) | 해당 없음 |

### 2-3. 알림·예약

| 기능 | 실거래(우리) | 수집기(외부) |
|---|---|---|
| 운영자 Vercel 정기 수집(5분 확인) + 회원 주기·시간대 | ○ `src/app/api/collect/dispatch/route.ts`, `src/lib/publicdata/schedule.ts`, `MonitoringSettings.tsx` | △ 1분 자동 반복(로컬) |
| 회원 cron-job.org 방식 | × 주인님 결정으로 적용 안 함([SCHEDULER_POLICY](SCHEDULER_POLICY.md) §8) | 해당 없음 |
| 지금 조회(1회) | ○ `src/components/districts/QueryNowButton.tsx`, `src/lib/actions/query.ts` | ○ |
| 텔레그램 알림(회원 봇) | ○ `src/lib/realestate/collect.ts` `notifyUserForListings`, 공용 `telegram/client.ts` | × |
| 알림톡 알림(회원 SOLAPI + 템플릿, 본인 핸드폰) | ○ `collect.ts`, `src/components/settings/KakaoTemplateSection.tsx` | × |
| 알림 때 AI 분석 켜기/끄기 | ○ `AutoAnalyzeForm.tsx`, `auto_analyze_on_notify`(v1.14·v1.15) | 해당 없음 |
| 예약 실행 직전 핸드폰 확인 | ○ `dispatch/route.ts` `phoneRegisteredUserIds` | 해당 없음 |
| 예약 실행 직전 사용기간·정지 확인 | ○ `dispatch/route.ts` `programAccessUserIds`(`src/lib/accessBatch.ts`) | 해당 없음 |
| 예약 비밀값 빈 값 차단 | ○ v1.16 | 해당 없음 |

### 2-3-1. 임장 노트(v1.34~v1.37)

| 기능 | 실거래(우리) |
|---|---|
| 촬영 위치 자동 저장·지도 확정 | ○ `src/components/onsite/CaptureButtons.tsx`, `src/lib/onsite/geo.ts` |
| 행정동 자동 분류(브라우저 판정) | ○ `public/dong-boundaries/`, `src/lib/onsite/locate.ts` |
| 30m 안 건물 도로명주소 자동 등록 | ○ 행정안전부 위치정보요약DB 격자(Storage `geo-address/v2/`), `src/lib/onsite/address.ts` |
| 지번(PNU)·공시지가·용도지역 보기 | ○ v1.37, 도로명주소 한글 전체분 연결(전국 100%), `onsiteLandInfoAction` → `ensureLandInfo` |

### 2-4. 보관·정리

| 기능 | 실거래(우리) |
|---|---|
| 지역 분위기 자동 삭제 + 회원별 정리 기록 | ○ `src/app/api/cron/cleanup-sentiment/route.ts`(매일 03:30 KST), `src/lib/cleanupUsageLog.ts`. 보관 1년(v1.20, 주인님 관리자 지정 — [최상위 규칙 §8](TOP_RULE_PERSONAL_ACCOUNT_API.md)) |
| AI 분석(`real_estate_analyses`) 자동 삭제 | ○ 같은 정리에서 1년(v1.20) |
| 임장 사진·기록 | ○ 1년 정리(`cleanup-sentiment` 안, v1.34), 비공개 버킷 `real-estate-onsite`, 본인 전용 RLS |
| 회원별 매칭(`real_estate_user_matches`) 정리 | × (공공 원천 연결·상태 표 — 생성물인지 판단 필요) |
| 공용 원천(`real_estate_listings`) 보관 | 기한 규칙 미확인(공공 데이터 예외 대상) |
| 옛 「공용 키 분석 재사용」 칸 | △ `used_fallback_key` 칸은 남고 코드는 `false`만 저장(재사용 조회 없음) |

## 3. 장점 요약

- 공식 공공 데이터만 써서 차단·약관 위험이 없고, 공용 원천을 한 번만 모아 공공 API 호출량이 회원 수와 무관하다.
- 유료 AI는 회원이 누를 때만, 같은 매물 중복 분석을 막고, 알림의 자동 분석도 끌 수 있다.
- 지역 분위기 캐시는 이미 회원별 + 30일 정리(v1.12).

## 4. 기능별 기준 코드 위치

| 기능 | 위치 |
|---|---|
| 공공 API 호출(서울·공공데이터포털·브이월드) | `real_estate_sales/src/lib/publicdata/client.ts` |
| 회원 공공 키 우선 → 공용 키 | `real_estate_sales/src/lib/publicdata/memberKeys.ts` |
| 정기 수집·알림 | `real_estate_sales/src/lib/realestate/collect.ts`, `src/app/api/collect/dispatch/route.ts` |
| 주기·동작 시간대 판정 | `real_estate_sales/src/lib/publicdata/schedule.ts` |
| 버튼 실행 AI 분석 + 1분 중복 차단 | `real_estate_sales/src/lib/actions/analysis.ts`, `src/lib/ai/analyze.ts` |
| 회원별 AI 캐시 + 30일 정리 | `real_estate_sales/src/lib/ai/sentiment.ts`, `src/app/api/cron/cleanup-sentiment/route.ts` |
| 무료 검수(상세·미리읽기 차단, 합성) | `real_estate_sales/tests/runtime.mjs`, `tests/fixtures.mjs` |

## 5. 병합 방향 (분석 의견)

- (2026-11-02) 부동산은 이제 3개 프로그램(실거래·아파트 호가·상가·건물·토지)이다. 서로 호출하지 않고 링크로 잇는다(작업표 RQ-A3). 2026-10-24 당시: 카테고리에 프로그램이 하나라 병합 대상은 없었다. 외부 원본 EXT-RE-01은 **독립 개발하지 않고**, 위험 없는 N1(바로가기)·N2(엑셀)만 `real-estate-sales`에 넣는 것을 추천한다(주인님 결정 대기). N3(회원 화면 매물 읽기)은 법률 확인 전 보류, N4(서버 비공식 수집)는 하지 않는다.

## 6. 확장 로드맵·미배포 대기 (사실 아님 — 계획)

- 우선 처리: [부동산 통합 작업표](REAL_ESTATE_CONSOLIDATION_TASKS.md) 「우선 처리」.
- 미배포 대기: 없음(2026-11-02 v1.37 기준). 예전 대기 4건은 v1.19~v1.22 때 함께 나감.

## 7. 변경 이력

- 2026-10-24 초안 작성(claude-win-dotori, 코드 검색 기준, 운영 DB·화면 미확인).
- 2026-11-02 RQ-0 문서 바로잡기([역할: realty]): v1.37 코드와 대조해 9칸 고침(전국·전월세·쪽 나눔·CSV·네이버/매물 알림 바로가기·당해 연도·확인됨 표시·예약 사용기간 확인·1년 정리), 임장 노트 표 추가, 상태를 담당 확인으로.
