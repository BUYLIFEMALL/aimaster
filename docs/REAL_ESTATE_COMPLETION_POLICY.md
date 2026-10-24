# 부동산 자동화 완성 기준

> **상태: 초안(2026-10-24, 작성 claude-win-dotori [역할: analysis-planning]) — 담당 세션 확인 전.** 부동산 카테고리는 아직 담당 역할이 없다([카테고리 지침 지도](CATEGORY_GUIDE_MAP.md) §3). 담당 세션이 확인·수정하기 전까지는 참고 자료로만 쓴다. 이 문서 작성으로 운영 코드·DB·권한·배포는 바뀌지 않았다.

- 적용 범위: ① AIMaster 운영(DB ref `esgxyikcnnvmlhygjkth`)의 「부동산」 카테고리 — `real-estate-sales`(부동산 실거래 투자분석 자동화, 폴더 `real_estate_sales/`, 코드 v1.18). 앞으로 만드는 실거래·시세·매물·지역 분석 프로그램에도 적용한다.
- 관계 문서: [부동산 기능 상세 비교표](REAL_ESTATE_FEATURE_MATRIX.md) · [부동산 통합 작업표](REAL_ESTATE_CONSOLIDATION_TASKS.md) · [회원 본인 계정·키 최상위 규칙](TOP_RULE_PERSONAL_ACCOUNT_API.md) §8(공공 데이터 키 예외) · [외부 프로그램 개발분석표](EXTERNAL_PROGRAM_ANALYSIS_REGISTRY.md) EXT-RE-01 · [매물 수집기 분석 보고서](analysis-naver-realty-collector-20261024/REPORT.md) · [예약 기능 지침](SCHEDULER_POLICY.md) §8 · [PLATFORM_PATTERNS](PLATFORM_PATTERNS.md) §20(공식 API 없는 서비스 자동화).

## 1. 완성 흐름 (목표)

**관심 지역 고르기 → 공공 데이터로 새 실거래 수집(정해진 주기·시간대) → 회원별 새 거래 표시 → 회원이 누를 때 AI 투자 분석(본인 키) → 알림(텔레그램·알림톡, 회원이 켠 것만) → 결과 보관(30일)과 정리 기록**

- 수집 원천은 **공식 공공 데이터 API**(서울 열린데이터 실거래·전월세, 공공데이터포털 건축물대장, 브이월드 공시가격·공시지가·토지이용)뿐이다(`real_estate_sales/src/lib/publicdata/client.ts`).
- 「현재 매물(호가)」은 지금 범위 밖이다. 공식 API가 없으므로 §5 규칙 안에서 주인님 결정 후에만 검토한다.

## 2. 「끝났다」고 말할 조건

1. **AI는 회원 본인 키로만**: OpenAI·Claude·Gemini·Perplexity 키는 회원 `user_api_keys` 값만 쓴다. 키가 없으면 실행하지 않고 등록 안내(현재 `src/lib/apiKeys.ts` `resolveApiKey` — 2026-10-09 운영자 환경변수 폴백 삭제).
2. **공공 데이터 키는 §4 예외 범위 안에서만** 운영자 공용 키를 쓴다. 범위 밖(AI·유료·회원 계정 연동)에 공용 키를 쓰지 않는다.
3. **회원 생성 데이터 격리**: AI 분석(`real_estate_analyses`)·지역 분위기(`real_estate_district_sentiment`)·관심 지역·알림 설정은 `user_id` + 본인 전용 RLS. 서버 키로 읽을 때도 코드에서 `user_id`로 거른다.
4. **30일 정리와 기록**: 회원 AI 생성물은 생성일 기준 30일 뒤 자동 삭제되고, 지운 건수를 회원별 정리 기록(`cleanup-usage-log` 사본, `src/lib/cleanupUsageLog.ts`)으로 남긴다. 지역 분위기는 이미 됨(`src/app/api/cron/cleanup-sentiment/route.ts`), AI 분석은 아직 없음 — 이 조건이 채워져야 「완료」.
5. **비용은 회원이 누를 때만**: 상세 화면을 열기만 해서는 유료 분석이 돌지 않는다(v1.13 버튼 실행). 예약 알림의 자동 분석은 회원이 켜고 끌 수 있다(v1.14 `auto_analyze_on_notify`). 같은 매물 1분 안 중복 분석 차단(`src/lib/actions/analysis.ts`).
6. **당해 연도·오늘 기준 프롬프트**: AI 프롬프트에 오늘 날짜(연도 포함)를 넣는다. 지역 분위기는 됨(`src/lib/ai/sentiment.ts` 「오늘(YYYY-MM-DD) 기준」), 매물 분석은 「제공 데이터 수집일」만 넣고 현재 연도 지시는 없음(`src/lib/ai/analyze.ts`) — 보강 대상.
7. **사실과 추정 구분**: 실거래·공시가격은 공공 데이터 값으로, 저평가 지수·상승예측률·투자 매력 점수는 AI 추정으로 표시하고 「투자 판단 책임은 회원」 안내를 둔다.
8. **검수 증거**: 로컬 검사(tsc·`tests/`) → 배포 Ready → 시험 계정 실제 화면. 유료 분석 버튼은 승인된 횟수만 누르고, 누르지 않았으면 「미검수」. 무료 검수는 상세·미리읽기를 막은 `tests/runtime.mjs`와 합성 `tests/fixtures.mjs`를 구분해 보고한다(`AGENTS.md` 「Windows 인수 주의」).
9. **문서 갱신**: 같은 작업에서 [부동산 기능 상세 비교표](REAL_ESTATE_FEATURE_MATRIX.md), 프로그램 `AGENTS.md`·`docs/IMPROVEMENTS.md`·`docs/CHANGELOG.md`, [프로그램 비교표](PROGRAM_CAPABILITY_MAP.md) 카드를 고친다.

## 3. 회원이 고르는 항목

| 항목 | 선택지 | 근거 |
|---|---|---|
| 관심 지역 | 서울 자치구 켜기/끄기 | `src/components/districts/DistrictToggle.tsx`, 표 `real_estate_watch_districts` |
| 예약 조회 주기·시간대 | 주기(짧은 주기는 2026-08-11 제거)·동작 시간대 | `src/components/districts/MonitoringSettings.tsx`, `src/lib/publicdata/schedule.ts` |
| 지금 조회 | 회원이 누를 때 1회 | `src/components/districts/QueryNowButton.tsx`, `src/lib/actions/query.ts` |
| AI 분석 모델 | 회원 등록 키 중 선택 | `src/components/settings/ModelPreferenceForm.tsx`, `src/lib/ai/models.ts` |
| 알림의 AI 분석 | 켜기(기본)/끄기 | `src/components/settings/AutoAnalyzeForm.tsx` |
| 알림 채널 | 텔레그램(회원 봇)·알림톡(회원 SOLAPI + 회원 템플릿) | `src/components/settings/TelegramConnectForm.tsx`, `KakaoTemplateSection.tsx` |
| 공공 데이터 본인 키 | 선택 등록(없으면 공용 키) | 설정 「공공데이터 키 (선택)」 `src/app/(dashboard)/settings/page.tsx`, `src/lib/publicdata/memberKeys.ts` |

## 4. 공공 데이터 키 예외 — 카테고리 지도 빈 칸 ①

[최상위 규칙 문서](TOP_RULE_PERSONAL_ACCOUNT_API.md) §8의 승인 기록을 이 카테고리 규칙으로 옮긴 것이다. 새 승인 없이 넓히지 않는다.

1. **승인 범위(2026-10-09, 2026-10-20 「당분간 유지」 재결정)**: 환경변수 `SEOUL_OPENDATA_API_KEY`·`DATA_GO_KR_SERVICE_KEY`·`VWORLD_API_KEY`·`VWORLD_REGISTERED_DOMAIN`·`N8N_VWORLD_PROXY_*`, 읽는 곳 `src/lib/publicdata/client.ts`, 그리고 그 키로 도는 운영자 Vercel 정기 수집(`/api/collect/dispatch`, 5분)뿐이다.
2. **조건**: 정부 공개 데이터라 비용 없음 / 누가 불러도 같은 공개 시장 데이터 / 키는 코드·문서에 넣지 않고 서버 환경변수로만 / 수집 1회분을 모든 회원이 함께 써서 호출량이 회원 수와 무관.
3. **공유 가능한 것은 공공 원천 데이터만**: 실거래 원본 표(`real_estate_listings`, 전역 `dedup_key`)는 공유해도 되지만, **그 위에 회원 키로 만든 AI 결과는 공유하지 않는다**(2026-10-16 생성 데이터 지시가 우선, §8 첫 줄). 과거 「공용 키로 만든 분석은 회원 간 재사용」 표시 칸 `real_estate_analyses.used_fallback_key`가 남아 있으나 지금 코드는 `false`만 쓴다(`src/lib/actions/analysis.ts`) — 재사용 조회를 다시 만들지 않는다.
4. **회원 본인 키 선택지**: 회원이 공공 키를 등록하면 그 키를 먼저 쓴다(`memberKeys.ts` `resolveMemberPublicDataKeys` → 없으면 공용 키). 브이월드는 키와 도메인이 짝일 때만.
5. **전환 신호**: 공공 API 일일 한도에 가까워지거나 회원이 늘어 한 키로 감당하기 어려우면, 회원별 공공 키 필수 전환 + 회원 예약 방식(`SCHEDULER_POLICY.md`) 플랜을 주인님께 먼저 보고한다.
6. **다른 프로그램으로 확장 금지**: 이 예외를 다른 부동산 프로그램에 쓰려면 다시 명시 승인을 받는다.
7. **브이월드 등록 도메인**: 기본값이 옛 `n8n.buylife.xyz`다(`client.ts` 18행). 포털에서 지우면 공시가격 조회가 멈춘다 — 새 주소 등록은 주인님 브이월드 로그인이 필요(`IMPROVEMENTS.md` #7).

## 5. 비공식 데이터 수집 금지 — 카테고리 지도 빈 칸 ② (EXT-RE-01 판단)

1. **서버가 비공식 내부 주소를 반복 호출하지 않는다.** 네이버 부동산 등 공식 API가 없는 서비스의 내부 주소(예: `new.land.naver.com/api/...`)를 서버에서 쿠키·토큰으로 반복 수집하거나 1분 자동 실행하지 않는다(EXT-RE-01 N4 — 하지 않기로 함). 이유: 예고 없이 막힘, 약관상 자동 수집 제한, PLATFORM_PATTERNS §20과 충돌, 데이터베이스 권리·부정경쟁 다툼 가능성, 운영자 IP·계정 위험, 회원 쿠키를 운영자가 다루게 됨.
2. **회원 쿠키·로그인 정보를 받지 않는다.** 개발자 도구에서 쿠키·curl을 복사해 붙이게 하는 방식은 만들지 않는다.
3. **허용되는 것(위험 없음)**: 외부 사이트로 가는 **바로가기 링크**(EXT-RE-01 N1), 공공 데이터 결과의 **엑셀·CSV 내보내기**(N2). 둘 다 주인님 진행 결정 대기.
4. **보류**: 회원이 직접 연 화면의 매물만 회원 브라우저 확장으로 소량 읽는 방식(N3)은 기술적으로 가능하지만 **주인님·법률 확인 전에는 진행하지 않는다.** 진행한다면 PLATFORM_PATTERNS §20(사람처럼 조작·반복 자동 없음)을 처음부터 적용한다.
5. 원본 프로그램의 패스워드 확인·공지·제휴 링크(N5)는 가져오지 않는다. 원본 코드·문구는 쓰지 않고 기능만 참고한다(핵심 원칙 21).

## 6. 하지 않을 것

- 운영자·다른 회원의 AI 키로 대신 분석하지 않는다(§4는 공공 데이터 키에만).
- AI 분석 결과·지역 분위기를 회원 사이에 공유·복사하지 않는다(전역 생성 캐시 금지).
- 상세 화면 열기·미리 불러오기만으로 유료 분석을 돌리지 않는다.
- 「확실한 수익」「반드시 오른다」 같은 단정 문구를 만들지 않는다 — AI 점수는 추정치로 표시한다.
- 공용 사본(`telegram/client.ts`·`solapi/client.ts`·`cleanupUsageLog.ts`)은 직접 고치지 않는다.

## 7. 완성 보고 양식(부동산)

수집 원천(공공 API 종류)·공공 키 예외 범위 안인지 / 비공식 수집 없음 확인 / AI 분석 실행 경로(버튼·알림)와 회원 키 / 30일 정리 영향(분석·분위기) / 당해 연도 프롬프트 / 유료 검수 여부(`runtime.mjs`·`fixtures.mjs`·실제 버튼 구분) / 서울 icn1 리전·Cron 유지 / 비용 리포트.
