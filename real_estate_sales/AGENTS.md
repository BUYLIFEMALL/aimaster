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

## 2026-10-20 (미배포) — 텔레그램 연동 확인 코드 보완 (Claude Code 윈도우)
- 원인: 웹훅 등록 때 `allowed_updates:["callback_query"]`를 지정하면 텔레그램이 그 값을 기억해, 웹훅을 지운 뒤 `getUpdates`(값 미지정)에서도 일반 메시지를 버림 → 연동 해제 후 다시 연동하면 「메시지를 찾지 못했어요」가 반복됨(2026-10-20 instagram-comment-reply v1.21에서 실제 발생·해결). 수정: `telegram/client.ts` `findChatIdFromUpdates`가 `allowed_updates=["message"]`를 매번 지정.
- 이 프로그램은 웹훅을 걸지 않아 다른 프로그램에서 쓰던 봇을 재사용할 때만 해당 → 급하지 않은 변경으로 분류, **코드만 저장소에 반영(tsc 통과)·다음 배포 때 함께 내보내고 그때 버전 +0.01.**

## 2026-10-21 — 텔레그램 연동 공용 모듈 `telegram-bot-client` (Claude Code 윈도우, 부계정)
- 이 프로그램의 텔레그램 `client.ts`는 공용 사본(직접 고치지 말 것 — 기준 `instagram-comment-reply/lib/telegram/client.ts`만 고치고 `--sync`). 운영 배포 v1.18(미배포였던 연동 확인 `allowed_updates` 수정·공용 사본 함께, 크롬 관리자 첫 화면 확인).

## 2026-10-21 — 미배포 공용 코드 변경 안내: `telegram-bot-client` 사본에 `linkButton` (Claude Code 윈도우)
- 사본 `src/lib/telegram/client.ts`의 `sendTelegramMessageWithButtons`에 선택 항목 `linkButton`(승인 버튼 줄 아래 링크 버튼 한 줄)이 추가됨(커밋 `802e89c8`). 이 프로그램은 넘기지 않으므로 **동작 같음**(tsc 오류 0 확인). 급하지 않은 변경이라 따로 배포하지 않았고, **다음에 이 프로그램을 배포할 때 버전 +0.01과 함께 나간다**. 사본은 직접 고치지 않는다 — 기준 `instagram-comment-reply/lib/telegram/client.ts`를 고친 뒤 `node scripts/check-shared-modules.mjs --sync`. 미배포 목록: 루트 `docs/SHARED_MODULES.md`.

## 2026-10-22 ⏸ 미배포 — 좁은 칸 버튼 줄바꿈/잘림 수정 (Claude Code 윈도우, 커밋 f0871e568)
- src/components/settings/ApiKeyRow.tsx: 버튼·짧은 문구에 whitespace-nowrap, 버튼 묶음 shrink-0(필요하면 flex-wrap). 기능·문구 변경 없음. **급하지 않아 배포하지 않음(주인님 B안) — 다음에 이 프로그램을 배포하는 CLI가 함께 내보내고 버전 +0.01, 이 항목을 「배포됨(버전)」으로 바꿀 것.** 근거: 루트 docs/UI_WRAP_AUDIT_20261022.md, 규칙 DESIGN.md 원칙 19.

## 2026-10-25 v1.19 — 「🔔 이 단지 새 매물 알림 받기」 버튼 ([역할: realty] Claude Code 윈도우)
- 실거래 상세 → `https://realty-listing-alert.buylife.xyz/targets?name=&region=`(매물 알림 감시 대상 미리 채우기). 미배포였던 공용 사본(`solapi-client`·`telegram-bot-client` `linkButton`)·30일 정리 회원별 기록 함께 배포. DB v1.19. 배포 `real-estate-sales-4k3sn3n8x`.

## 2026-10-30 v1.23 — RE-B4 경기·인천 확장 + RE-B5 `zod` ([역할: realty] Claude Code 윈도우 · 세션 `claude-win-realty-docs`)
- 경기 44·인천 10곳(`lib/publicdata/districts.ts` `GYEONGGI_DISTRICTS`·`INCHEON_DISTRICTS`·`SIDO_GROUPS`·`findDistrict`). 서울 밖은 국토부 아파트 매매 실거래가 API(15126469)로 이번 달·지난달 조회(`fetchMolitTrades`) → 서울 줄 모양으로 변환(`lib/publicdata/molit.ts`, 해제 거래 버림) → 중복 키·PNU·건축물대장·공시가격·AI 분석·알림은 그대로. 전월세 비교는 서울만(2차). 감시 지역 화면 서울/경기/인천 묶음. 시험 `npm run test:molit` 5개. 플랜 `docs/PLAN_20261030_RE_B4_GYEONGGI_INCHEON.md`.
- `zod` ^4.6.7(GHSA-mrhx-c7xc-m3w5, 로그인 글자 검사에만 써서 악용 경로 없음) → `npm audit` 0건.
- 실물(크롬, 시험 계정): 「고양시 일산동구」 선택 → 「지금 조회하기」 → 새 실거래 20건 저장·실거래 내역에 표시(단지·동·계약일·층·거래가). **발견**: 경기 줄 「전용」이 모두 비어 있음(건축물대장에서 못 찾음) → 국토부 전용면적으로 채우기(`de7ec2b30`, 미배포).
- ⚠ `vercel env pull`은 민감 변수를 실제 값 대신 `[sensitive]`로 준다 — 이 값으로 공공 API를 부르면 403이 나와 「키 승인 안 됨」으로 잘못 판단하기 쉽다(10-30 실제로 착오, `docs/ERROR_LESSONS.md`).
- 남은 것: 화성시 일반구 코드 확인(지금 41590), 경기·인천 전월세 비교(2차), 공시가 「-」(서울도 같음, RE-B3 후속 확인).

## 2026-10-30 v1.24·v1.25 ([역할: realty] Claude Code 윈도우 · 세션 `claude-win-realty-docs`)
- **v1.24**: 경기·인천은 건축물대장에서 전용면적을 못 찾으면 국토부 전용면적(`ARCH_AREA`)을 씀(`collect.ts`, `de7ec2b30`). 기존 고양시 일산동구 20줄은 주인님 승인으로 운영 DB에서 `exclusive_area = building_area` 채움(남은 빈 줄 0).
- **v1.25**: 실거래 목록 주소 거르기 `?district=<시군구5자리>`·`?q=<단지명>`(서버에서 `!inner` 조인으로 거름, 0건이면 이름 앞 두 글자로 다시 찾고 「비슷한 이름으로 찾았어요」, 「전체 보기」, 쪽 이동 때 조건 유지) — 「부동산 실시간 매물 알림」 v1.38 「📈 실거래 보기」가 이 주소로 연다. 감시 지역 화면 경기 44곳을 시 이름으로 묶음(`groupByCity`, 경기에만). 시험 `test:molit` 6개. 커밋 `1d8cd99c5`.
- 실물(크롬, 시험 계정): 전용면적 표시, `?district=41285&q=백송건영` → 「백송」으로 1건, 매물 알림에서 「📈 실거래 보기」 → 고양시 일산동구 20건, 경기 시 묶음 표시 확인.

## 2026-11-06 v1.55 배포 — 분양권 상한 밀림 고침 + R-ONE 상권 좌표 보강 ([역할: realty] `claude-win-realty-docs`, 주인님 「진행해」 빌드 1회)
- 실림: `presaleFirst`(`b40baa1ae`) + 좌표 보강(`1c8b800a3`). 배포 `real-estate-sales-qaq2mxs93`(Ready, 운영 주소 연결), DB v1.55(마이그레이션 `20261106000200_version_v1_55.sql`). **제 `deploy.mjs` 실행은 Claude Code 자동 권한 검사(운영 배포)에 두 번 막혀 주인님이 `! node scripts/deploy.mjs real_estate_sales --go`로 실행**(같은 세션 안에서 돌아 결과가 대화로 들어옴).
- 배포 뒤 확인: ① `/api/admin/rone-refresh?retry=missing&geocode=150` 1회 — 40곳 더 찾아 맨 끝 상권 좌표 347→**387/417**(남은 30곳은 「서울>주요지역」·「도안신도시 남부권」처럼 장소 이름이 아님 → 시·도 평균 대체 그대로). ② 「지금 조회하기」 1회 → **분양권 1건 저장: 힐스테이트 등촌역 2026-10-02 · 84.71㎡ · 17.1억 · 8층 = 공개시스템 값과 동일**(강서구 이번 회차 40건: 분양권 1·아파트 25·빌라 13·오피스텔 1). 목록 화면 유형 「분양권」·공시가 「대상 아님」 표시 확인. 저장 원본은 변환 뒤 줄(`raw_data`에 `BLDG_USG: 분양권`, `ARCH_AREA 84.71`, `FLR 8`, `ARCH_YR` 빈칸) — 국토부 응답 칸 aptNm·excluUseAr·floor 변환이 실물로 맞음. 작은 발견: `STDG_CD`(법정동 코드)가 빈칸(서울 분양권은 `LEGAL_DONG` 표에서 못 찾음 — 필지 조회를 안 하는 유형이라 영향 없음, 개선 후보).
- ⚠ 확인 조회는 **관리자 계정**으로 돌아갔음(ego 새 작업 공간이 관리자 로그인 상태였고 계정을 먼저 확인하지 않음) → 관리자 키로 AI 분석 20건·텔레그램 20건 비용 발생. 다음부터 조회 전에 화면의 로그인 이메일을 먼저 읽고 시험 계정이 아니면 멈춘다.

## 2026-11-06 분양권 0건 원인 확정 + 고침(→ v1.55로 배포됨) ([역할: realty] `claude-win-realty-docs`)
- **확인(시험 계정 강서구 「지금 조회하기」 1회, ego lite):** 4개 지역 새 실거래 40건·5개 지역은 220초 예산으로 건너뜀. 강서구 07:40 저장 40건(아파트 17·빌라 15·오피스텔 6·단독 2), **분양권 0**. Vercel 실행 로그에 「분양권 조회 실패」 없음(= SilvTrade는 오류 없이 응답).
- **공개시스템 대조(rt.molit.go.kr, 키 없이 `POST /pt/gis/ptDanjiList.do`·`/pt/gis/ptDtl.do`, 법정동 10자리 코드로만 조회됨 — 「구 전체」 코드는 0건으로 나옴):** 강서구 2026년 분양·입주권 거래는 등촌동 「힐스테이트 등촌역」(단지 코드 1500075689) 9건 — **2026-10-02 분양권 84.71㎡ 17.1억 8층 · 09-06 입주권 59.57㎡ 14.1억** 등. 우리 수집 범위(최근 2달 `molitMonths`)에 10-02 건이 드는데 저장 안 됨. 종로구는 공개시스템도 2026년 0건(우리 거래량 표 6달 0과 일치 → API 정상).
- **원인:** 서울은 열린데이터 최신 200건(강서구 10월만 아파트 204·빌라 177 신고) 뒤에 분양권이 붙고, v1.49 계약일순 재정렬을 해도 10-02는 200건보다 오래돼 뒤로 감 → 회당 저장 상한 20건(`MAX_NEW_LISTINGS_PER_DISTRICT`)에 매번 밀림. 매 회차 서울 목록이 「최신 200건」이라 영원히 차례가 안 옴. 11-04 「상한에 밀림」 추정은 맞았지만 재정렬은 해법이 아니었음.
- **고침:** `molit.ts presaleFirst()` — 분양권 줄을 저장 후보 맨 앞으로(나머지 순서 그대로, 서울·서울 밖 공통). `collect.ts`의 서울 재정렬 제거. 시험 `tests/molit.test.mjs` 1개 추가(49 통과), tsc 통과. **배포: 미배포 대기**(작은 수정, `docs/PENDING_DEPLOYS.md` — 좌표 보강 `1c8b800a3`과 함께 다음 배포). 배포 뒤 시험 계정 강서구 「지금 조회하기」 1회 → `property_type='분양권'` 줄과 `raw_data`(aptNm·excluUseAr·floor·ownershipGbn) 실물 대조(아직 미대조).
- 교훈: 「거래량 표 0건」은 그 지역에 거래가 없다는 뜻이지 기능 확인이 아니다. 공개시스템 동별 조회(ego, 무료)로 거래가 있는 지역·단지를 먼저 찾고 그 지역으로 확인한다. `docs/ERROR_LESSONS.md` 2026-11-06.

## 2026-11-06 v1.54 배포 — RQ-A4 1단계 상권 임대료·공실률 ([역할: realty] `claude-win-realty-docs`, 주인님 승인 11-06)
- 순수 함수 `src/lib/realestate/commercialRent.ts`(표 8개 번호·응답 읽기·상권별 합치기·권역(leaf 아님) 구분·시도 맞추기·1.5km 안 가까운 상권), 시험 `tests/commercialRent.test.mjs` 4개(전체 47 통과).
- 서버 `commercialRentData.ts`: R-ONE 표 8개 → 캐시 표 `rone_commercial_rent`(마이그레이션 `20261106000100_rone_commercial_rent_v1_54.sql`, ego SQL 적용, RLS 켜고 정책 없음 = 서버만), 상권 좌표는 브이월드 장소 검색(같은 시·도 주소만)·지난 분기 좌표 재사용. 리포트는 인스턴스당 1시간 기억.
- 관리자 갱신 `/api/admin/rone-refresh?geocode=60`(최대 150, `&only=geocode`면 좌표만 이어 채움), 서울 지역 `icn1` 실행. 리포트 비주거 칸 아래 「🏷️ 가까운 상권 임대료·공실률」(`CommercialRentSection.tsx`, 상권·시도·전국 열, ㎡당·평당·공실률, 「상권 평균이라 이 건물 값이 아님」).
- 진단 `/api/admin/rone-probe`에 키 길이·지문(sha256 앞 8자리, 값 아님)·실행 지역 추가.
- 함께 나감: AI 모델 선택지 정리(PLAN_20261103_MODEL_MIGRATION_DEC, 이 폴더 몫).
- **(같은 날 이어서) 키 해결·표 채움 완료:** 주인님이 R-ONE 「인증키 발급내역」의 키를 더블클릭으로 다시 복사해 저장 → 진단 32자·지문 84256908·`INFO-000`. 끌어서 고르면 두 글자가 빠져 30자(1fcc069b)가 세 번 들어갔음 — **R-ONE 키는 더블클릭 복사, 메모장에서 32자 확인**. `/api/admin/rone-refresh?geocode=60` 1회 + `?only=geocode&geocode=150` 3회: 2026년 3분기 443개 지역 저장(표 8개 306·277·269·66·306·277·269·66줄), 맨 끝 상권 417곳 중 347곳 좌표(83%), 70곳 못 찾음(「구도심·원도심」, 「석남/가정중앙시장」처럼 두 이름, 서울 북촌·서촌·시청 등 — 리포트는 시·도 평균으로 대신). 표본 대조: 강남대로 중대형 130.58·공실 6.4%, 사상역 17.72·19.01% = 0단계 값, 좌표 고양시청·사상역·강남대로 실제 위치. **남은 것:** 비주거 리포트 실제 화면 확인(상가·건물·토지 종류 임장 기록이 관리자·시험 계정에 없음), 못 찾은 70곳 좌표 보강(「/」로 나눠 찾기·「시도 + 이름」 다시 찾기 — 작은 개선, 미배포 대기 후보), 분기마다 갱신(다음 2027년 초 4분기 공표 뒤 관리자 갱신 주소 1회, 예약은 나중 검토).
- 이전 기록: 배포 2회(빌드 2회, 승인 범위). R-ONE은 그때 ERROR-290: 운영 키가 30자(지문 1fcc069b), 정상 발급 키는 32자(지문 84256908) — Vercel 값에서 두 글자가 빠짐. 서울 지역에서도 같아 해외 차단 아님. → 주인님이 `RONE_API_KEY` 32자로 다시 넣고 재배포(빌드 1회, 추가 승인 필요) → 진단에서 지문 84256908·INFO-000 확인 → `/api/admin/rone-refresh` 몇 번(좌표 약 290곳) → 비주거 리포트 화면 확인.

## 2026-11-05 v1.53 배포 — RQ-A4 0단계 R-ONE 진단 ([역할: realty] `claude-win-realty-docs`, 플랜 `docs/PLAN_20261105_RQ_A4_COMMERCIAL_RENT.md`)
- 관리자·운영 계정 전용 중계 `/api/admin/rone-probe?service=SttsApi….do&STATBL_ID&CLS_ID&ITM_ID&DTACYCLE_CD&WRTTIME_IDTFR_ID&pIndex&pSize&grep=` — Vercel `RONE_API_KEY`(Secret, Production, 2026-11-05 주인님 등록)로 R-ONE Open API를 불러 그대로 넘김(키 비노출, 서비스 이름·요청 칸 화이트리스트, `grep`은 그 글자가 든 줄만).
- 함께 나감: 지도 가운데 📍 핀(`d46717d97`).
- 배포 직후 첫 호출: R-ONE `ERROR-290 인증키가 유효하지 않습니다` — 발급 요청 뒤 승인·활성화 전으로 보임. 키가 유효해지면 재배포 없이 진단 주소만 다시 부르면 됨(키 값을 바꾸면 Vercel 재배포 필요).

## 2026-11-05 v1.51·v1.52 배포 — RQ-B5 주소 리포트 2차: 상가·건물·토지 + 지도 ([역할: realty] `claude-win-realty-docs`, 플랜 `docs/PLAN_20261105_RQ_B5_NONRES_REPORT_MAP.md`)
- v1.51(0단계): 관리자 진단 `/api/admin/nonres-probe`(관리자·운영 계정만) — 결과는 플랜 §0단계 결과·`docs/evidence/b5-nonres-probe-20261105.json`. 미배포 대기였던 저장 리포트 등기부 칸(`f7d15a34e`)도 함께 나감.
- v1.52(`402c371ac`): 비주거 임장 기록 리포트는 주거 세 유형 찾기(18회)를 건너뛰고 상업업무용 12달·토지 6달을 받아 `lib/realestate/nonres.ts`(`summarizeNonRes`, 시험 `tests/nonres.test.mjs`)로 요약 — 집합 상가 같은 지번 거래 목록(최대 20)·같은 동 「구분·용도」별 건수·평당가 중간값(5건 미만 숨김)·범위, 토지 지목별(동 5건 미만이면 시군구 참고). 지분·취소 제외. 화면 `components/report/NonResSection.tsx`, 저장 리포트·AI 총평 입력·나란히 비교(같은 지번 거래 건수)에도 들어감. 동 이름은 필지 번호의 법정동 코드로 찾음(`dongFromPnu`).
- 지도: 모든 리포트 위에 위치 지도 한 장 — 서버 주소 `/api/report-map?x&y`(로그인 회원만, 한국 범위만, 브이월드 2D 정적 지도를 받아 그림만 넘김·키 비노출·브라우저 하루 캐시). 좌표는 임장 기록이면 `lat`·`lon`, 실거래 매물이면 「시군구 동 지번」을 브이월드 주소→좌표(`vworldGeocode`)로(리포트 1회당 브이월드 1건 추가). 「네이버 지도에서 보기」 링크.
- 운영 확인(ego lite 관리자 계정, 작업 공간 하나·닫음): 실거래 매물 리포트에 지도 640×360 표시·가운데 원미아파트, 네이버 링크 정상. **핀이 안 보임** → 화면에서 가운데 핀을 겹치게 고침(⏸ 미배포 대기 `d46717d97`). **비주거 칸 화면은 미확인** — 임장 기록은 사진 위치로만 만들어져 시험용 상가 기록을 화면에서 만들지 못함(자료 경로는 0단계 진단과 같은 호출·시험 43개로 확인). 상가 임장 기록이 생기면 그 리포트로 확인.

## 2026-11-04 v1.50 배포 — RQ-B4 위험 점검 ([역할: realty] `claude-win-realty-docs`, 플랜 `docs/PLAN_20261104_RQ_B4_RISK_CHECK.md`)
- 주소 리포트: 전세가율에 구간(70% 미만 보통·70~80% 주의·80% 이상 위험, `riskBand`), 사용승인일이 없으면 「미사용승인 가능성」 안내, 건물 정보 아래 위반건축물 안내(공공 API 응답에 위반 칸이 있는지 공식 문서로 확인 못 해 추측 표시 안 함 — 정부24 열람 안내만).
- 「🧾 등기부로 권리 점검」(`components/report/RegistryCheck.tsx`, 서버 액션 `registryCheckAction`, AI `lib/ai/registryCheck.ts`): 회원이 발급한 등기부 PDF(3MB 이하, `%PDF-` 확인)를 회원 본인 Claude 키(`claude-sonnet-5-5`, 재시도 0, `output_config.format` JSON 스키마)로 1회 읽어 항목 표·채권최고액 합계·「(채권최고액+보증금)÷매매 시세」(`gapRiskPercent`) 표시. 사람 이름은 AI 지시 + 서버 `maskPersonName`으로 가림(기관 이름은 그대로). **PDF·내용·결과 저장 안 함, 서버 기록에도 안 남김**, 전송 동의 체크 전에는 버튼 잠금. 서버 액션 크기 한도 `next.config.ts` `experimental.serverActions.bodySizeLimit: "4mb"`. 저장 리포트 화면에는 아직 없음(「리포트 보기」에만).
- 시험: `tests/risk.test.mjs` 3개(전체 40개)·tsc·빌드. 가짜 등기부 `tests/fixtures/fake-registry.pdf`(만드는 스크립트 `make-fake-registry.py`, 이름·주소 모두 지어낸 값, 정답 주석 포함).
- 운영 확인(ego lite, 작업 공간 하나, 끝난 뒤 닫음): 관리자 계정으로 칸 표시·동의 전 버튼 잠금·위반건축물 안내, **시험 계정 본인 Claude 키 1회로 가짜 등기부 대조 — 20초, 근저당 2.4억(주의)·말소 근저당 1.2억(말소 표시)·가압류 0.3억(위험)·소유자 홍○○·채권자 김○○ 모두 정답과 일치**. 소유권보존은 종류 「기타」로 분류됨(설명 칸에 보존 등기라고 나옴). 390px는 ego 창 폭 조절이 안 돼 미확인. 배포 `real-estate-sales-17y0h2iws`, DB v1.50.
- **공개 결정(2026-11-04 주인님): 「그대로 공개 유지」** — 등기부 점검은 이 프로그램 권한이 있는 회원 모두에게 공개(저장 안 함·회원 본인 키·전송 동의 체크 그대로). 390px: ego 창 최소 폭 때문에 창 줄이기가 안 돼, 390px 틀(iframe) 안에서 확인 — 위쪽 ☰ 메뉴, 가로 넘침 없음, 등기부 칸 346px·버튼 44px(실제 휴대폰 확인은 아님). ⏸ 미배포 대기: 저장한 리포트 화면에도 등기부 칸·인쇄 때 올리기 칸 숨김(`f7d15a34e`). 남은 것: 「소유권보존」 종류 추가 여부.

## 2026-11-04 v1.49 배포 — 서울 분양권 계약일순 재정렬 ([역할: realty] `claude-win-realty-docs`)
- v1.48 운영에서 강서구 분양권 0건이던 원인(서울은 분양권을 목록 끝에 붙여 지역당 20건 상한에 밀림)을 고침: 합친 뒤 `normalizeDate` 기준 계약일 최신순 재정렬. 주인님 「진행해」 빌드 1회, 배포 `real-estate-sales-kocrxxfxc`, DB v1.49.
- 확인 방식: 관리자 키 AI 분석을 다시 돌리지 않으려고 「지금 조회하기」는 누르지 않음 → 다음 예약 회차(지역별 주기) 뒤 DB `real_estate_listings`에서 `property_type = '분양권'` 줄과 원본(`raw_data`) 칸 대조. 시험 계정으로 확인할 때는 ego 로그인 계정부터 바꾼다.

## 2026-11-04 v1.48 배포 — 분양권 추가 + 수동 조회 시간 예산 ([역할: realty] `claude-win-realty-docs`)
- 분양권: 국토부 분양권 전매(`SilvTrade`, 15126471)를 다섯째 유형 「분양권」으로. 매매만 있고 전월세 자료가 없어 `MOLIT_SERVICE.rent`를 선택 칸으로, 전월세는 `RENT_TYPES`만. 아직 지어지지 않은 집이라 건축물대장·공시가·전월세 비교를 건너뜀(단독과 같이 `noLookup`), 같은 단지 순위는 그대로. 서울은 서울 열린데이터에 없어 국토부 분양권만 따로 받아 붙임. 목록 거르기·공시가 「대상 아님」·상세 안내 문구. 회원이 유형을 직접 골라 둔 경우(4개 저장)는 분양권이 꺼진 상태 — 설정에서 켬. DB 변경 없음(유형 칸 제약 없음). 시험 37개(분양권 시험 추가, v1.46 기대값 4→5)·tsc·빌드 통과.
- 운영 확인(ego lite, 관리자 계정, 작업 공간 하나): 「지금 조회하기」 **220초에 끝까지**(v1.47은 301초 오류) — 강서구 새 실거래 20건·텔레그램 20건. 같은 회차 저장: 아파트 27·빌라 7·오피스텔 5·단독/다가구 1, **분양권 0** → 원인: 서울은 분양권을 목록 맨 뒤에 붙여 지역당 상한 20건에 밀림. 계약일순 재정렬로 고침(⏸ 미배포 대기). 운영 기록에 분양권 조회 실패 없음. 국토부 분양권 응답 칸(aptNm·excluUseAr·floor)은 아직 실물 미대조 — 다음 배포 뒤 확인.
- 배포 `real-estate-sales-l6lj3bimi`, DB v1.48. 아래는 같은 버전에 함께 나간 시간 예산 수정 기록.

### (함께 나감) 시간 예산 — 원래 「⏸ 미배포 대기」였던 항목 — 수동 조회 300초 초과의 실제 원인: 알림 전 AI 분석 ([역할: realty] `claude-win-realty-docs`)
- v1.47 배포 뒤에도 「지금 조회하기」가 18:43:49 시작 300초 초과, 그 사이 오류 기록 0 → 외부 조회 실패가 아니라 지역마다 새 매매(최대 20건)에 AI 분석(`ensureListingAnalysis`, 실패는 기록 없이 삼킴)을 한 건씩 차례로 돌리는 단계가 길었음(단독/다가구로 새 매매 증가).
- 수정: `notifyUserForListings(..., { deadline })` — 수동 조회는 시작 200초, 예약 수집은 240초가 지나면 남은 건은 AI 분석 없이 알림만(알림은 빠뜨리지 않음, 분석은 상세 화면에서). 단독/다가구 알림 문구 「연면적 ○m²」(층 없음).

## 2026-11-04 v1.47 (배포함, 수동 조회 시간 초과는 남음 → v1.48) — v1.46 배포 뒤 발견 2건 수정 ([역할: realty] `claude-win-realty-docs`)
- 운영 기록(`vercel logs`): 시험 계정 「지금 조회하기」(관심 지역 8곳)가 `/districts` 300초 시간 초과로 끊김, 예약 수집에서 `real_estate_listings_dedup_key_key` 중복 1건 — 둘 다 v1.46 배포(`dpl_2Wapfopas8fW3Fyet1NmEd1RrJsZ`) 뒤 처음(유형 4개로 지역당 호출 증가, 단독/다가구는 같은 회차에 똑같은 줄이 나올 수 있음).
- 수정: `query.ts` 220초 예산(넘으면 남은 지역은 건너뛰고 화면에 「n개 지역은 이번에 건너뛰었어요」), `collect.ts` 같은 회차 중복 키는 한 번만 저장, 단독/다가구는 건축물대장 조회도 건너뜀. 시험 36개·tsc·로컬 빌드 통과.

## 2026-11-04 v1.46 — 단독/다가구 실거래 추가 + 빌라 매매 RHTrade2 ([역할: realty] 세션 `claude-win-realty-docs`)
- 공공데이터 단독/다가구 매매(`SHTrade`)·전월세(`SHRent`) 2026-11-04 승인 → 유형 「단독/다가구」(`PROPERTY_TYPES` 4개, `DETACHED`, `LOT_TYPES`=필지로 맞출 수 있는 3개). 서울 자료 용도 「단독다가구」도 받음(이름이 비면 「단독주택 지번」).
- 국토부 단독/다가구는 단지 이름·전용면적·층이 없고 지번 일부가 가려짐(「1**」) → 이름 「다가구주택 1**」(`detachedName`), 면적 = 연면적(`totalFloorAr`), 대지면적은 원본 줄 `LAND_AREA`, 필지 번호(`pnu`) 비움 → 건축물대장·공동주택 공시가·같은 단지 순위·직전 전월세 비교는 건너뜀(목록·상세 공시가 「대상 아님」, 상세 「연면적 · 대지」). 주소 리포트 유형 자동 찾기는 `LOT_TYPES`만.
- 세 유형만 저장해 둔 회원은 그대로(새 유형 안 받음), 고르지 않은 회원은 네 유형 모두. 목록 유형 거르기에 「단독/다가구」.
- 응답 칸 이름은 공식 문서 기준(이 PC는 공용 키가 Vercel 민감 값이라 사전 조회 못 함) → **배포 뒤 수집 기록에서 단독/다가구 건수·「빌라 … 조회 실패」 사라짐 확인 필요**.
- 함께 내보냄: 빌라 매매 `RHTrade2`(11-04 미배포 대기분). 시험 36개(`tests/molit.test.mjs` 기대값 「단독다가구 → 단독/다가구」로 고침)·tsc·로컬 빌드 통과.

## 2026-11-02 v1.40 — B0 주소 리포트 사전 검증 진단 ([역할: realty] 세션 `claude-win-realty-docs`)
- 플랜 [docs/PLAN_20261102_B_ADDRESS_REPORT.md](docs/PLAN_20261102_B_ADDRESS_REPORT.md), 주인님 「진행해」. 관리자 전용 `GET /api/admin/report-probe`: 실거래 매매 줄에서 아파트 8·빌라 6·오피스텔 6곳(서로 다른 PNU) + 지번 붙은 임장 기록 최대 3곳을 골라 리포트 9칸(사용승인일·용적률·건폐율·주차·공시가격·개별공시지가·용도지역·같은 단지 매매 3건+·같은 단지 전세) 채움률을 잰다. 건축물대장 표제부 조회 `fetchBuildingTitle`(getBrTitleInfo) 추가 — B1에서 그대로 쓴다.
- 측정: 관리자 로그인 필요(11-02 크롬은 시험 계정). 건축HUB가 같은 공용 키를 쓰면 11-02에 상가 층 진단으로 하루 한도(429)가 찼을 수 있어, 표제부 칸이 비면 다음 날 다시 잰다.

## 2026-11-02 v1.38·v1.39 — A2 보유 자료 최고가·최저가, 지역 거래량 / A3 이동 링크 ([역할: realty] 세션 `claude-win-realty-docs`)
- 플랜: [docs/PLAN_20261102_A2_A3.md](docs/PLAN_20261102_A2_A3.md), 주인님 「진행해」. 계산은 `src/lib/realestate/insights.ts`(시험 `tests/insights.test.mjs`, 전체 30개 통과).
- 최고가·최저가: 새 매매를 저장할 때 같은 시·군·구·법정동·단지명, 전용 ±3㎡, 계약일 12개월 안의 보유 매매 3건 이상과 비교해 모두보다 높으면 `high`, 낮으면 `low`를 `real_estate_listings.price_rank`에 저장(`collect.ts` rankAgainstStored). 목록·카드 배지, 상세 안내, 텔레그램·알림톡 줄. 「신고가·역대」라 쓰지 않는다. 배포 뒤 새 거래부터 붙는다.
- 거래량: 국토부 매매 API에 줄 1개만 묻고 응답 `totalCount`를 시·군·구×계약월×유형으로 `real_estate_trade_volume`(RLS 켜고 정책 없음, 서버 키만)에 기록. **서울도 국토부 API로 센다**(서울 열린데이터는 한 해 묶음이라 달별 건수가 없음 → 플랜의 「추가 호출 없음」과 다름, 무료 공공 API). 6개월, 최근 세 달은 하루 한 번·그 전은 한 번만, 회차당 지역 6번 상한(시간 제한). 2026-11-02 실측: totalCount 정상(서초 9월 129건 등).
- **v1.39 수정:** v1.38은 신고 중인 지난달(계약 후 30일 신고)을 비교해 모든 지역 10월이 낮게 보였고, 유형별로 모인 달이 달라 합계가 섞였다(동탄 🔥 착시 가능) → 신고가 끝난 달(2달 전) vs 그 전 3개월, 비교 4개월이 다 모인 유형만 합산(`sumCompleteTypes`). 관심 지역 화면 표(지난달 「신고 중」 표시, 포함 유형 칸), 알림 🔥 줄.
- A3: 좌측 메뉴 「🔗 함께 쓰는 부동산 프로그램」, 관심 지역 화면 상가 감시 바로가기.
- DB(운영): `20261102000200_a2_price_rank_volume_v1_38.sql`(크롬 SQL 편집기). 남은 확인: 며칠 뒤 거래량 표 채워짐, 첫 최고가 배지.

## 2026-11-02 v1.37 — 임장 노트 지번 연결 ([역할: realty] 세션 `claude-win-realty-docs`)
- 주인님 「전부 진행」. 원본 두 개(같은 202609): 위치정보요약DB + 「도로명주소 한글」 전체분(`rnaddrkor_<시도>.txt`, 칸 1 법정동코드·6 산여부 0/1·7·8 지번·9 도로명코드·11 지하·12·13 건물번호·19 공동주택). 위치 자료 키(6 도로명코드·8 지하·9·10 건물번호)로 시도별 연결 → **전국 640만 곳 연결 100%(못 찾음 0)**.
- 격자 v2: 칸 끝에 `PNU`(법정동 10 + 산 1/2 + 본번 4 + 부번 4)·공동주택("1"/"") 추가, 82,161개·압축 108MB → `geo-address/v2/`. 사용: `node --max-old-space-size=8192 scripts/build-geo-address.mjs <위치정보요약DB.zip> <출력> --road=<도로명주소 한글.zip> --upload`. v1 경로는 옛 배포용으로 남겨 둠.
- DB(운영 `esgxyik…`): `real_estate_onsite_properties`에 `pnu`(19자리 검사)·`jibun`(표시용) 칸 추가(마이그레이션 `20261102000100_onsite_pnu_v1_37.sql`, 크롬 SQL 편집기로 적용). 계획은 칸 1개였으나 지번 표기에 법정동 이름이 필요해 표시용 칸을 하나 더 둠.
- 화면: 30m 안 자동 주소에 지번도 함께 저장(`autoParcel`). 편집 화면에 「🧭 지번」과 **「공시지가·용도지역 보기」**(`onsiteLandInfoAction` → 기존 `ensureLandInfo`·캐시 `real_estate_land_info` 재사용, 브이월드 운영자 공공데이터 키 예외 그대로). 주소를 손으로 고치면 지번을 뗀다. 공동주택이면 「유형도 골라 주세요」 안내(아파트·연립·다세대가 섞여 자동 선택 안 함).
- 시험 26개 통과, `tsc`·`npm run build` 통과. 업로드 82,161개 성공·실패 0.
- 운영 확인(11-02, 크롬·시험 계정): 기존 임장 기록에서 「위치로 주소 찾기」 → 지번 표시 → 저장 → 「공시지가·용도지역 보기」에 개별공시지가(2025년 기준)·용도지역 목록이 나옴. 사진 새로 찍기의 자동 지번 저장은 현장에서 확인 필요.

## 2026-11-02 v1.36 — 임장 노트 회원 공개 ([역할: realty] 세션 `claude-win-realty-docs`)
- 주인님 「오픈해도 되」로 관리자·시험 계정 제한(`canUseOnsite`)을 지움. 이제 프로그램 이용 권한(`requireProgramAccess`)이 있는 회원 누구나 쓴다. 메뉴 「📷 임장 노트」 항상 표시. 미배포 대기였던 소개 문구(`5eaa1797d`)도 함께 나감.
- 근거: 현장 3곳 자동 주소 대조 — 1번 브라운스톤 23m 맞음, 3번 경의로 25-53 23m 맞음, 2번은 지하철 출구(야외)라 바로 옆 건물 22m(백석역 46m). 주소는 주인님 채팅 답으로 대조, 저장소에 적지 않음.
- 확인 못 한 것: 브이월드 배경지도 하루 한도(공개 뒤 사용량을 지켜본다), 아이폰.

## 2026-11-02 v1.35 — 임장 노트 주소 자동 등록 ([역할: realty] 세션 `claude-win-realty-docs`)
- 원본: 행정안전부 「도로명주소 위치정보요약DB」 전체분 202609(주인님 신청·승인, `D:PDS609_위치정보요약DB_전체분.zip`). 642만 줄, 건물마다 대표 출입구 1곳, 좌표 UTM-K.
- 변환·업로드: `scripts/build-geo-address.mjs <zip> <출력> [--upload]` → 위경도 약 1km 격자(0.01도) 8만 2천여 개, 압축 약 85MB를 운영 Supabase Storage 공개 읽기 버킷 `geo-address/v1/<격자>.json.gz`에 올린다(쓰기는 서버 키만, 공공데이터라 회원 정보 없음). 용도가 빈 줄(가로판매대 등)은 뺀다. **매달 새 전체분을 받으면 다시 돌린다.**
- 화면: 촬영 때 가장 가까운 건물이 30m 안이면 도로명주소를 자동 저장(`address_source=auto`). 지도에서 위치를 옮겨 확정하면 회원이 적은 주소가 아닐 때만 새 주소로 바꾼다. 편집 화면 「📍 위치로 주소 찾기」는 거리·용도를 보여 주고 30m가 넘으면 근처일 수 있다고 알린다. 좌표는 서버로 보내지 않고 주변 격자 파일만 받는다(`src/lib/onsite/address.ts`, 압축은 브라우저 `DecompressionStream`).
- 코드: `geo.ts` utmkToWgs·tileKey·tilesFor·distanceM·formatAddress·nearestAddress, 시험 `tests/onsiteGeo.test.mjs` 3개 추가(전체 25개 통과).
- 한계: 지번이 없어 공시가·실거래 연결은 아직 안 된다. 유형은 「주택」에 아파트·빌라가 섞여 자동으로 고르지 않는다. 회원 공개는 여전히 관리자·시험 계정만(브이월드 한도 확인 뒤).
- 운영 확인(11-02 18:1x, 크롬·관리자 계정): 격자 82,161개 업로드 성공·실패 0(첫 실행이 1만 8천 개쯤 연결 끊김으로 멈춰 재시도·--skip 추가 후 이어 올림). 임장 기록 1곳에서 「위치로 주소 찾기」→ 약 23m·업무시설·고양시 일산동구 도로명주소 채워짐(저장은 안 누름). 현장 정답 표본 3곳 대조는 주인님 확인 필요.
- ⏸ 미배포 대기: 임장 노트 소개 문구를 「30m 안의 건물이면 도로명주소도 자동으로」로 고침(`onsite/page.tsx`). 다음 배포 때 함께.
- 남은 문제(기존): `src/components/onsite/OnsiteMap.tsx` 34줄 린트 오류(렌더 중 ref 갱신, v1.34부터).

## 2026-11-01 v1.34 — 임장 노트 1차 ([역할: realty] 세션 `claude-win-realty-docs`)
- 메뉴 「📷 임장 노트」 `/onsite`, 상세 `/onsite/[id]`. **`src/lib/onsite/types.ts`의 `canUseOnsite`로 관리자·시험 계정에만 연다**(주소 자동 등록 뒤 회원 공개, 주인님 결정).
- 저장 흐름: 카메라를 여는 순간 위치 측정 시작 → 오차 25m 이하 또는 20초까지 대기 → 브라우저에서 사진 축소 → 서버가 만든 서명 주소로 바로 업로드(함수 본문 4.5MB 제한 회피) → `saveOnsiteCaptureAction`. 위치가 없으면 지도 가운데 핀에 맞춰 지정.
- 표 `real_estate_onsite_properties`·`real_estate_onsite_photos`(본인 전용 RLS), 비공개 버킷 `real-estate-onsite`(정책 없음, 서버가 권한 확인 뒤 서명 주소 발급). 1년 정리는 `cleanup-sentiment` 안.
- 행정동 분류: `public/dong-boundaries/`(상가 프로그램에서 복사, `scripts/build-onsite-boundaries.mjs`, CC BY 4.0 출처 화면 표시). 좌표를 서버로 보내지 않고 브라우저에서 판정. 판정 코드는 상가 `adminDongGeo.ts`와 같은 방식이며 공용 기준 코드로 등록하지 않았다.
- 주소 칸은 회원 입력만 있다. 자동 등록은 위치정보요약DB 도착 뒤: `docs/analysis-realty-roadmap-20261031/PLAN_ONSITE_GEO.md` §10.
- 배경지도: 브이월드 WMTS, 키는 `VWORLD_API_KEY`를 화면에 전달한다. 회원 공개 전 도메인 제한·일일 한도 확인.
- 미확인: 실제 휴대폰 촬영, 현장 위치 정확도, 1년 정리 실행, 실제 창 폭 375px. 아이폰은 안드로이드 뒤(주인님 결정).

## 2026-10-31 v1.33 — 전월세 거래 목록·알림 ([역할: realty] 세션 `claude-win-realty-docs`)
- 같은 표에 저장: `deal_type`(매매/전세/월세, 기본값 매매), `monthly_rent`, 보증금은 `price_amount`. 회원 설정 `deal_types`(기본 매매만, 전세·월세는 회원이 켬). 자료는 서울 포함 국토부 전월세 3종, 지역당 수집 1회 새 전월세 20건(줄마다 외부 조회 없음).
- 전월세는 AI 투자 분석 안 함(알림·상세 버튼·서버 액션 모두 차단), 공시가·㎡당·공시가 대비 표시 안 함. 평균·최고 KPI는 매매만. 알림은 매매 먼저.
- 중복 확인을 100개씩 나눠 조회(`findExistingKeys`).
- 시험: 8개 지역 264줄(전세 77·월세 75 안팎), 거래 종류 빈칸 0, 약 3분. 목록·상세 크롬 확인.
- 미배포 대기: 매매 저장 때 `deal_type` 명시(DB 기본값으로 이미 동작), 월세 표기 「월세 100만/43만」.
- 시험 계정은 받을 거래 종류를 매매·전세·월세 모두 켠 상태로 둠.

## 2026-10-31 v1.32 — 공용 키 교체·20건 안내 ([역할: realty])
- 주인님이 Vercel `DATA_GO_KR_SERVICE_KEY`를 신청 계정 키로 교체 후 재배포. 관심 지역·사용 매뉴얼에 지역당 20건 안내. 연립 매매는 포털 [승인]이지만 호출 403(10-31 기준).

## 2026-10-31 v1.31 — 전국, 빌라·오피스텔, 유형 필터 ([역할: realty] 세션 `claude-win-realty-docs`)
- 시·군·구 256곳(시·도 16). 지역 목록·법정동 코드표는 `scripts/build-national-regions.mjs`로 생성(직접 고치지 않음).
- 표 칸 `real_estate_listings.property_type`, `real_estate_user_preferences.property_types`(마이그레이션 20261031000500, 기존 2,328줄 채움: 아파트 1,179·빌라 728·오피스텔 421). 목록 필터·유형 칸, 설정 「받을 건물 유형」, 알림 거르기, CSV 칸.
- 수집: 서울 밖은 AptTrade·RHTrade·OffiTrade를 합쳐 계약일 최신순, 지역당 새 줄 20건 유지(시간 제한). 한 유형이 승인 전(403)이어도 나머지는 받는다. 전월세는 유형별. 오피스텔은 공시가 조회 생략(「대상 아님」).
- **전남광주통합특별시(코드 12)**: 국토부 실거래는 새 코드, 브이월드는 옛 코드(광주 29, 전남 46) → `vworldPnu`로 조회 때만 변환. 27곳 표본 공시가 94/94. 저장값은 새 코드. 건축물대장 조회는 미확인.
- 국토부 API는 동시에 부르면 429(34곳 뒤) → `molitGet`이 2초 뒤 한 번 재시도, 순차 호출.
- 실측: 231곳 코드 유효(5곳은 그 달 거래 0), 표본 공시가 대부분 맞춤, 전월세 맞춤은 제주 아파트 6/15·전남광주 동구 오피스텔 1/10처럼 지역차 큼. 시험 조회 131줄.
- 남은 일: ~~RHTrade 403(승인 반영 대기)~~ → 2026-11-04 원인 확인: 승인은 10-31에 났고 코드가 옛 주소를 불렀음. `molit.ts` 빌라 매매를 `RHTrade2`로 고침(**v1.46으로 배포**, 배포 뒤 수집 기록에서 「빌라 … 건수 조회 실패」가 사라지는지 확인) 뒤 빌라 확인, 운영 공용 키의 새 서비스 승인 여부 확인, 시험 스크립트 `probe-molit-regions.mjs`·`probe-match-rate.mjs`.

## 2026-10-31 v1.30 — 면적 범위·면적 표기·특수 거래 표시 ([역할: realty])
- 면적 맞추기 범위를 면적의 3%(최소 1㎡)로, 전용면적을 거래 신고 면적 우선으로(건축물대장 첫 줄은 다른 세대일 수 있음), 공시가 대비 100% 미만·400% 초과에 ⚠️ 표시. 기존 줄 재적용: 면적 1,602·공시가 비움 4·새로 채움 2, 오류 0. 복구 전 값 백업 assessed-backup-20261031-b.json.
- 수집 대상 차이 확인: 서울 자료는 아파트 959·연립다세대 728·오피스텔 421(건물 유형 거르기 없음), 경기·인천은 아파트 전용 API. 주인님 결정 대기.

## 2026-10-31 v1.29 — 공시가 면적·층 맞추기, 경기·인천 전월세 ([역할: realty] 세션 `claude-win-realty-docs`)
- 공시가: `pickAssessedPrice`(면적 차 2㎡ 안, 같은 층 우선, 없으면 중간값, 맞는 면적이 없으면 비움). 조회 1,000줄까지(더 큰 필지는 일부만 비교).
- 전월세: `fetchMolitRents`(RTMSDataSvcAptRent, 지역당 수집 1회·최근 3달), `pickRentComparable`(같은 단지·동·면적의 최근 전세, 없으면 월세). 서울도 같은 함수를 쓰지만 면적 칸 `RENT_AREA`는 실제 응답 미대조(없으면 이름만 맞춤).
- 실측(시험 수집 100줄, 6개 지역 중 5곳): 공시가 94줄, 보증금 85줄, 거래가÷공시가 1.36~4.42(중간 1.67), 전세÷거래가 0.23~1.00(중간 0.70).
- 기존 줄 복구 완료(주인님 승인 2026-10-31, `scripts/repair-assessed-prices.mjs`): 2,328줄 중 값 변경 1,276, 새로 채움 121, 비움 63, 그대로 389, 조회 결과 없음 460(손대지 않음), 오류 0. 필지 번호 40줄 중 21줄 고침, 19줄은 같은 단지 정상 번호가 없어 그대로. 복구 전 값 백업: `D:\Antigravity\AIMaster_backup\real-estate-sales\assessed-backup-20261031.json`(id·pnu·official_price, 30일 뒤 삭제).
- 튀는 줄 대조(2026-10-31): 1배 미만 11줄 전부, 4배 초과 39줄 중 상위 25줄을 필지 원본과 대조. 대부분 단지명·면적·층이 일치해 공시가 자체는 맞음. 4배 초과는 동작구 21·서초구 13에 몰린 소형 빌라(거래 사유는 자료에 없음). 약한 맞춤: 강남웅진베어스빌 22.08㎡가 20.63㎡로 맞춰짐(면적 허용 2㎡가 소형에 넓음, 미수정 제안).
- 남은 일: 공용 키 실조회 확인, 필지 번호 19줄(지번 미저장), AI 분석에 저장된 옛 공시가 수치.

## 2026-10-31 v1.27 — 지역 찾기·리 코드 ([역할: realty] 세션 `claude-win-realty-docs`)
- 관심 지역 「🔎 지역 찾기」(`DistrictSearch.tsx`). 미배포 대기: 낱말별 검색 `9a794af1a`.
- 브이월드 키: 개발키로 운영(주인님 결정 2026-10-31), **만료 2027-04-30**, 연장 최대 3회. 운영키 신청은 이미지 업로드 오류(원인 미상)로 보류, 만료 전 연장 또는 재신청. 알림: 주인님 구글 캘린더 2027-04-01·04-23 10:00 일정(2026-11-04 등록), 처리 순서는 `docs/roles/realty.md` 「다음 첫 단계」 5번.
- 실데이터 확인(2026-10-31, 시험 계정 지금 조회 1회, 시험 계정 브이월드 키): 국토부 표기 「남양읍 남양리」, 필지 번호 앞 10자리 4159125621, 화성 만세구 20줄 중 공시가 19줄. 기존 경기 80줄 중 40줄은 필지 번호 14자리로 잘못 저장(복구 미실행). Vercel 공용 키는 같은 날 v1.28 배포로 교체 적용.
- 확인할 것: 공시가가 같은 필지의 다른 세대 값일 수 있음(경희궁의 아침 3단지 거래 3.185억·공시가 14.13억), 상세 ㎡당 거래가 설명의 면적 표기 불일치.
- `legalDong.ts`에 경기·인천 리 1,537곳(`scripts/build-legal-dong-ri.mjs`, 키 「남양읍 남양리」). 새로 수집하는 줄부터 적용, 공시가 실조회는 브이월드 키 해결 뒤 확인.

## 2026-10-30 v1.26 — 화성·인천 지역 코드, 경기 필지 번호, 공시가 원인 ([역할: realty] Claude Code 윈도우 · 세션 `claude-win-realty-docs`)
- 지역 코드: 국토부 법정동 자료(`realty-listing-alert/public/regions.json`)와 58곳 대조 → 화성시 만세·효행·병점·동탄구(41591~41597), 인천 제물포(28125)·영종(28155)·서해(28275)·검단구(28290). 시험 `test:molit`에 대조 시험(그 파일이 있을 때).
- 필지 번호: 국토부 응답에 `umdCd`·`bonbun`·`bubun` 없음(`umdNm`·`jibun`만, 10-30 실측) → `legalDong.ts`(경기·인천 903개 동) + `splitJibun`. 표는 `molitRows(jsons, sggNm, LEGAL_DONG)`로 넘김(시험에서 `.ts` 확장자 import 문제 피하려고). 읍·면은 리 코드가 없어 읍 코드로.
- 공시가: 브이월드가 오류 코드를 주면 던져서 로그에 남김 → 운영 로그 `INCORRECT_KEY`. 10-27 수집분부터 공시가 0(10-26 v1.22 도메인 변경 뒤). 키·서비스 주소·환경변수 대조는 주인님 몫.
- 실물: 「화성시 동탄구」 조회 → 20줄 모두 19자리 필지 번호·전용면적.
