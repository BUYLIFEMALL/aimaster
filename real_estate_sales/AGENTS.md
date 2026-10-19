# 부동산 실거래 투자분석 자동화 (`real_estate_sales/`, slug `real-estate-sales`) — 작업 지침

- 먼저 루트 `CLAUDE.md`·`docs/HANDOFF.md`·`docs/ERROR_LESSONS.md`, 이 폴더의 [README.md](README.md)(아키텍처·환경변수·배포)와 [docs/CHANGELOG.md](docs/CHANGELOG.md)를 읽는다.
- 라이브: https://real-estate-sales.buylife.xyz · Next.js 16 + Tailwind v4 · Vercel 서울 리전 고정(`vercel.json` `regions: ["icn1"]`, 공공 API 국내 IP 전용).
- 권한: 레이아웃·서버 액션 모두 `requireProgramAccess()`, 예약 수집 API는 `CRON_SECRET`. AI 키는 회원 본인 것만(폴백 없음). 공공데이터 키는 운영자 공용(최상위 규칙 예외 §8).

## 디자인 리뉴얼 — v1.11 (2026-10-17, Claude Code 맥미니, 주인님 승인 후 구현)
- 적용 템플릿: **스마트 매트릭스 스타일(다크 슬레이트)** — [docs/DESIGN_HANDOFF.md](docs/DESIGN_HANDOFF.md) · 플랜 [docs/PLAN_20261017_DESIGN_RENEWAL.md](docs/PLAN_20261017_DESIGN_RENEWAL.md) · 개선 원장 [docs/IMPROVEMENTS.md](docs/IMPROVEMENTS.md) · 인수인계 [docs/IMPROVEMENT_HANDOFF_20261017.md](docs/IMPROVEMENT_HANDOFF_20261017.md)
- 다크 토큰(옛 `gold`·`dark-*` 이름은 재연결), 사이드바 ☰·📖, 대시보드 지표·연결 상태, 실거래 목록 매트릭스(검색·자치구·정렬·표/카드), 상세 지표·매력도 막대, `/guide` 신설, 로그인까지 다크(원칙 13). 서버 로직 변경 없음.
- **Windows 빌드·배포·무료 화면 검수 완료(v1.11, 소스 `156bb4ad`, 2026-10-17).** 운영 DB v1.11, 서울 icn1·Cron 유지. 실제 Edge 로컬9/운영9·합성9 통과, 유료0. 상세 운영 방문은 제외. 증거·남은 일은 위 인수인계의 최신 완료 절을 읽습니다.

## Windows 인수 주의 — 실제 상세 방문 전 확인

`/listings/[id]`는 GET 서버 렌더 중 본인 키로 자동 AI 분석할 수 있습니다. 무료 검수는 실제 상세/미리읽기를 차단한 tests/runtime.mjs와 합성 tests/fixtures.mjs를 분리해 실행합니다. 앱 인증·DB·분석을 검수용 모의 코드로 바꾸지 않습니다. 본인 Perplexity 생성 캐시는 운영 user_id 없는 전역 구조(#10)로 최상위 데이터 격리 지침과 충돌합니다. 해결 완료/공유 예외로 보고하지 않고 DB 전환 승인이 필요한 별도 미해결로 남깁니다. Next 보안 보완/개발 의존성 경고는 #11, 상세 GET 위험은 #12를 읽습니다. 블랙 확정은 유지합니다.

## 2026-10-17 v1.12 — AI 시장조사 캐시 회원별 분리·30일 자동 삭제 (Claude Code 윈도우, IMPROVEMENT_HANDOFF #10 해결)
- 주인님 지시 "각각 사용자 별로 분리해줘". `real_estate_district_sentiment`에 `user_id`(auth.users, on delete cascade) 추가, 고유 조건을 `(user_id, sgg_nm, sentiment_date)`로, RLS를 인증 회원 전체 → 본인 전용(select/insert/update/delete `auth.uid() = user_id`). 마이그레이션 `supabase/migrations/20261017_district_sentiment_per_user_v1_12.sql`(운영 적용).
- 코드: `src/lib/ai/sentiment.ts` `getDistrictSentiment(supabase, userId, sggNm, key)` — 조회·저장 모두 user_id 기준(서비스 키 경로여도 코드에서 소유자 필터). `analysis.ts` 호출부 수정. 타입에 user_id 추가.
- 30일 보관: `src/app/api/cron/cleanup-sentiment`(CRON_SECRET Bearer) + `vercel.json` 매일 18:30 UTC(03:30 KST) — `created_at` 30일 지난 행 삭제.
- 기존 주인 없는 5건(2026-08-10~16, 모두 30일 경과): 임의 소유자 지정·회원별 복사 없이 새 정책에서 아무도 못 보게 됨 → 첫 정리 cron 실행 때 삭제됨.
- 검수: 빌드·배포·DB v1.12, RLS 시뮬레이션(시험 회원: 기존 공유 0건 조회, 본인 행 저장·조회 1건, 다른 회원 user_id로 저장 차단 — 모두 롤백), 정리 라우트 비인증 401, 크롬 대시보드 v1.12. 실제 AI 분석 실행(유료)은 하지 않음.
- 주의: 마이그레이션 첫 적용이 MCP 일시 오류로 실패한 상태에서 코드가 먼저 배포돼 몇 분간 새 코드와 옛 스키마가 어긋났음 → 즉시 재적용. 다음엔 DB 적용 성공을 확인한 뒤 배포.
## 2026-10-17 v1.13 — 상세 화면 자동 유료 분석 제거, 버튼으로만 실행 (Claude Code 윈도우, IMPROVEMENT_HANDOFF #12 해결)
- 주인님 지시 "사용자가 버튼을 클릭했을 때 실행되도록". `listings/[id]/page.tsx`에서 `ensureListingAnalysis()` 호출 제거 → 열람만으로는 OpenAI·Perplexity 호출 없음(미리 불러오기·새로고침 비용도 없음). 분석 없으면 "아직 분석하지 않았어요 + 본인 키 요금 안내 + [🤖 AI 분석 실행]"(`ReanalyzeButton first`), 있으면 기존 [다시 분석하기].
- 중복 방지: `reanalyzeListingAction`이 같은 회원·매물에 1분 안에 만든 결과가 있으면 다시 호출하지 않음(두 번 클릭·여러 탭). 버튼은 실행 중 비활성.
- 그대로 둔 것: 회원이 켠 "예약 조회"(collect → 텔레그램 알림) 경로의 `ensureListingAnalysis`는 회원이 직접 켠 자동 기능이라 유지(필요하면 켜기/끄기 선택 추가는 별도 제안).
- 검수: 빌드·배포·DB v1.13, 시험 계정으로 분석 없는 매물 상세 열람 → 안내·버튼 표시, DB 분석 기록 0건 유지(자동 실행 없음). 버튼 클릭(유료)은 하지 않음.
## 2026-10-17 v1.14 — 예약 조회 알림의 AI 분석 켜기/끄기 (Claude Code 윈도우)
- 주인님 승인(추가 개선 제안): `real_estate_user_preferences.auto_analyze_on_notify boolean not null default true`(운영 적용, 기본값 = 기존 동작 유지). 마이그레이션 `20261017_auto_analyze_on_notify_v1_14.sql`.
- `collect.ts notifyUserForListings`: 설정이 꺼져 있으면 `ensureListingAnalysis` 호출 안 함(유료 호출 없음), 이미 있는 분석 결과만 알림에 붙임. 설정 행이 없으면 켜짐으로 간주.
- 설정 화면: "예약 조회 알림의 AI 분석" 체크박스(`components/settings/AutoAnalyzeForm.tsx`, `saveAutoAnalyzeAction`) + AI 모델 안내 문구를 v1.13 이후 동작(상세는 버튼으로만)에 맞게 정정.
- 검수: DB 칸 적용 확인 후 빌드·배포(v1.14).
## 2026-10-17 v1.15 — 알림 AI 분석 체크박스 저장값 반전 수정 (Claude Code 윈도우)
- v1.14 화면 검수 중 발견: 끄고 저장(정상) 후 다시 켜고 저장하면 꺼짐으로 저장됨. 원인 = React 19 폼 액션이 저장 뒤 폼을 초기화하면서 제어(`checked`+`useState`) 체크박스의 화면과 상태가 어긋남. `AutoAnalyzeForm`을 비제어(`defaultChecked={enabled}`)로 변경. 다른 폼에도 같은 패턴(제어 체크박스 + `useActionState`)이 있으면 같은 문제 가능.
- v1.15 검수: 시험 계정 설정 화면에서 켜기→저장(DB true)·끄기→저장(false)·켜기→저장(true) 3회 모두 일치, 원상(켜짐) 복구. 알림 경로의 꺼짐 동작(분석 미호출)은 예약 cron·유료 호출이라 코드 확인만.

<!-- DETAILED_PROGRAM_REVIEW_20261019 -->
## 2026-10-19 Codex — 프로그램별 상세 개선 분석(구현 아님)

[세부 개선안·필요 이유·근거·시험 조건](docs/DETAILED_REVIEW_20261019.md) · [전체 83개 분석](../docs/program-reviews-20261019/INDEX.md) · [공통 아이디어 표](../docs/PROGRAM_IDEA_BACKLOG.md). 이 프로그램 3개 검토 항목입니다. 코드·DB·환경변수·배포는 바꾸지 않았습니다. 작업 전 최신 개선 원장·ACTIVE_WORK와 대조하고 이미 해결된 기능은 보존합니다. 후속 작업 후 처리 ID·증거·미완료·새 인사이트·프로그램 링크를 기록합니다.
<!-- /DETAILED_PROGRAM_REVIEW_20261019 -->

## 2026-10-20 v1.16 — 실행 주소 비밀값 검사 보완 (Claude Code 윈도우)
- `src/app/api/collect/dispatch`·`src/app/api/cron/cleanup-sentiment`(2곳)의 `auth === \`Bearer ${process.env.CRON_SECRET}\`` → `CRON_SECRET`이 비면 「Bearer undefined」를 보낸 누구나 통과하던 빈틈을 `Boolean(secret) && …`로 차단(회원 화면·동작 변화 없음). 지금은 Vercel에 `CRON_SECRET`이 등록돼 있어 실제로 뚫린 적은 없음 — 방어 보완. 근거·전체 목록: 루트 `docs/SCHEDULER_PRIORITY2_REVIEW_20261020.md` §2-1, `docs/ERROR_LESSONS.md` 2026-10-20.
- 검수: `tsc` 0, `npm run build`, 배포 `real-estate-sales-209i3dqj5`(Ready), DB `programs.version` v1.16, 운영 주소 실행 주소 무인증·`Bearer undefined` 모두 401, `/login` 200. 5분 예약 수집(`/api/collect/dispatch`)의 새 배포 첫 운영자 호출(vercel-cron) 16:35:29 UTC 200 — 진짜 비밀값 호출은 정상 통과.
- 텔레그램 `migrate-webhooks`는 이미 「비밀값이 있을 때만」 검사, `webhookSecret.ts`는 비밀값이 없으면 오류로 멈춰 안전(변경 없음).
