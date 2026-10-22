# 개선사항 기록 — 부동산 실거래 투자분석 자동화 (`real-estate-sales`, 폴더 `real_estate_sales/`)

## 2026-10-17 Claude Code(맥미니) — 디자인 리뉴얼 사전 분석 중 발견

| # | 내용 | 근거·영향 | 우선순위 | 상태 | 관련 파일 | 다음 첫 단계·검수 |
|---|---|---|---|---|---|---|
| 1 | 휴대폰 ☰ 없음 | 원칙 19 — 좁은 화면에서 메뉴가 본문 위에 쌓임 | 높음 | **운영 반영·Edge 검수 완료(v1.11)** | `src/components/layout/Sidebar.tsx` | 375px 검수 |
| 2 | 사용 매뉴얼 없음 | 원칙 9 — 실거래가·공시가·점수 읽는 법 안내 없음 | 중간 | **운영 반영·Edge 검수 완료(v1.11)** | `src/app/(dashboard)/guide` | 화면 |
| 3 | 실거래 목록 검색·필터·정렬 없음, 50건 제한 | 여러 자치구를 보면 비교 어려움 | 중간 | **검색·필터·정렬 운영 반영·합성 검수 완료(v1.11)** / 페이지 나눔은 미해결 | `listings/page.tsx` | 정렬·필터 검수 |
| 4 | 상세 화면을 열기만 해도 AI 분석이 자동 실행 | 회원 본인 키 비용이 "열람"만으로 발생(기존 캐시 재사용 시 생략) — 명시적 실행·비용 안내 개선 필요 | 중간 | 미구현(제안) | `listings/[id]/page.tsx`, `lib/actions/analysis.ts` | 설정에 「열 때 자동 분석」 켜기/끄기 + 화면에 비용 안내 |
| 5 | 「안 본 새 실거래」가 열어 봐도 줄지 않음 | 상태가 분석·알림 때만 바뀌고 "열람"은 기록 안 함 → 대시보드 숫자가 계속 남음 | 중간 | 미구현(제안) | `real_estate_user_matches.status` | 상세 열람 시 `new → seen` 표시(스키마 값 추가 필요할 수 있음) |
| 6 | 서울만 지원 | 서울 열린데이터 API 한정 | 낮음 | 기존 과제 | `lib/publicdata/districts.ts` | 국토부 실거래 API로 경기·인천 확장 검토 |
| 7 | VWorld 등록 도메인이 옛 `n8n.buylife.xyz` | 포털에서 지우면 공시가격 조회 중단 | 중간 | 기존 과제(주인님 VWorld 로그인 필요) | `VWORLD_REGISTERED_DOMAIN` | 포털에 `real-estate-sales.buylife.xyz` 추가 후 환경변수 변경 |
| 8 | 공공데이터 키 회원별 전환 여부 | v1.04 남은 결정 | 낮음 | 주인님 결정 대기 | `lib/publicdata/memberKeys.ts` | 결정 후 진행 |
| 9 | 옛 금색 테마 이름(`gold`·`dark-*`)에 흰색 값 | 이름과 실제 색이 달라 유지보수 혼란 | 낮음 | **운영 반영·Edge 검수 완료(v1.11)** | `src/app/globals.css` | 옛 이름은 의도적으로 유지·재연결. 운영 계산 색 검수 통과(클래스 0건 목표 아님) |

## 2026-10-17 Codex(Windows) — Windows 인수 검사 추가 발견

- **#10 AI 조사 캐시의 회원 격리·30일 보관 (높음·미해결)**: `lib/ai/sentiment.ts`가 본인 Perplexity 키로 생성한 시장 조사 결과를 `real_estate_district_sentiment`의 자치구+날짜만으로 조회/upsert합니다. 운영 catalog에도 user_id가 없고 authenticated 전체 SELECT/INSERT/UPDATE가 확인됐습니다(생성물 내용은 읽지 않음). 주인님 최신 생성 데이터 공유 금지·30일 보관 원칙과 충돌하며 과거 공공 API 키 예외를 AI 생성 캐시 공유 허가로 해석하지 않습니다. 이번 인수에서 연구/AI 경로를 실행하거나 DB 정책·자료를 변경하지 않았습니다. 다음 첫 단계: 소유자별 새 저장소·기한/정리·기존 무소유 자료의 접근 제한 전환안을 작성하고 필요한 DB/삭제 승인을 확인합니다. 임의 소유자 추정·회원에게 일괄 복사·관리자 공용 AI 캐시는 금지입니다. 다른 공공 수집 자료의 과거 예외 적용 여부도 최신 지시와 별도 대조합니다.
- **#11 기존 의존성 보안 경고 (보완·일부 남음)**: 초기 npm audit 11건(critical1/high10), Next16.2.11. [공식 next/og 공지](https://github.com/vercel/next.js/security/advisories/GHSA-vcvr-r3jv-pc5j)·[Windows 공지](https://github.com/vercel/next.js/security/advisories/GHSA-p293-qw3h-jr36)와 npm 수정 버전을 대조해 같은16계열 Next/eslint-config-next16.4.2 및 허용 범위의 source-map-js/brace-expansion/js-yaml을 갱신했습니다. 보완 후 운영 의존성0건, 전체는 개발 lint 도구 사슬5high(braces/fast-glob/micromatch/eslint-config-next/@next/eslint-plugin-next) 남음. 실제 악용 검사는 안 했고 전체 보안 해결을 주장하지 않습니다. npm audit fix --force가 권하는 구버전 다운그레이드는 하지 않습니다. 다음: lint 사슬의 공식 수정판/대체 경로를 별도 검토하고 회귀 검사. before/after JSON은 docs/evidence/.
- **#12 상세 GET의 자동 분석과 검수·미리읽기 위험 (높음·미해결)**: 상세가 서버 렌더 중 ensureListingAnalysis를 호출하므로 브라우저 POST만 막아도 비용 발생을 막을 수 없습니다. tests/runtime.mjs는 상세/미리읽기 GET까지 검사 브라우저에서 차단하고 실제 상세는 방문하지 않습니다. #4 자동 분석 선택/명시적 실행·동시 요청 중복 방지·Next Link 미리읽기 정책을 함께 검토합니다. 이번 무료 검수의 상세·유료 분석 품질은 합성 경계 검사이며 운영 유료 검수로 확대하지 않습니다.

## 2026-10-23 ~~⚠ 확인 필요 — 지역 분위기(AI 시장조사) 캐시가 회원 구분 없는 공용 표~~ → 아래 「정정」(잘못된 판단) (Claude Code 윈도우, 발견만·미처리)
- `real_estate_district_sentiment`에는 `user_id`가 없고 `unique (sgg_nm, sentiment_date)`라 지역·날짜마다 한 줄뿐이다. 그런데 정리 코드(`src/app/api/cron/cleanup-sentiment/route.ts`) 주석은 「회원별 AI 시장조사 캐시」라고 한다.
- 회원 본인 키로 만든 AI 결과를 다른 회원이 그대로 받아 쓰는 구조라면 최상위 규칙(생성 데이터 회원별 격리·전역 생성 캐시 금지, `docs/TOP_RULE_PERSONAL_ACCOUNT_API.md`)과 어긋난다. 무료 공공 데이터만으로 만드는 값이면 예외 조항 해당일 수 있음 — 생성 경로(어느 키로 만드는지) 확인 후 주인님 판단 필요.
- 같은 날 정리 코드에 「cleanup-usage-log: 회원 데이터 아님」 표시(`05902a01d`, 주석만 — 배포 불필요)를 달아 관리자 「30일 정리 기록」 진행률 분모에서 뺐다.

## 2026-10-23 정정 — 지역 분위기 캐시는 v1.12부터 회원별 (Claude Code 윈도우)
- 위 「확인 필요」 항목은 **잘못된 판단**이었다. 처음 표를 만든 SQL(`20260810050751_real_estate_sales_init.sql`)만 보고 user_id가 없다고 봤으나, `supabase/migrations/20261017_district_sentiment_per_user_v1_12.sql`에서 이미 `user_id` 추가·`unique (user_id, sgg_nm, sentiment_date)`·회원 본인 RLS로 바뀌었고, `src/lib/ai/sentiment.ts`도 회원 본인 Perplexity 키로 만들어 본인 행만 읽고 쓴다. **최상위 규칙 위반 없음.** (운영 표가 0행이라 칸을 직접 확인하지 못한 것이 원인)
- 조치: 정리 코드의 「회원 데이터 아님」 표시를 지우고 회원별 `usage_logs` `cleanup_expired`(sentiments) 기록을 붙임(`61142a909`, 공용 `cleanup-usage-log` 사본). **미배포 대기** — 다음 배포 때 함께, 버전 +0.01.
