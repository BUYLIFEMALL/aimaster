# 데이터수집 기능 상세 비교표 (기준 문서)

> **상태: 초안(2026-10-24, 작성 claude-win-dotori [역할: analysis-planning]) — 담당 세션 확인 전.** 칸은 모두 2026-10-24 코드에서 파일을 찾아 채웠다. 담당 세션이 정해지면 화면 검수와 대조해 확정한다.

> **데이터수집 프로그램을 새로 만들거나, 기능을 추가·확장·병합하기 전에 이 문서와 [데이터수집 자동화 완성 기준](SCRAPING_COMPLETION_POLICY.md)을 먼저 읽는다.**
>
> - 대상: ① AIMaster 운영(DB ref `esgxyikcnnvmlhygjkth`). 남은 프로그램 1개 + 병합된 1개.
> - 기준 시점·버전: **2026-10-24**, 웹 크롤링 자동화 코드 `v1.10`(`web-crawler/webapp/src/lib/version.ts`) · Website Scraper 코드 `v1.14`(`ghost-scraper/src/lib/version.ts`, 기능은 v1.13부터 중지).
> - 근거: 두 폴더의 현재 코드, [스크래핑 통합 분석 보고서](analysis-scraping-consolidation-20261021/REPORT.md) §1·§2·§6, `web-crawler/AGENTS.md`, `web-crawler/IMPROVEMENTS.md`, `ghost-scraper/AGENTS.md`. 운영 DB는 이번 작성에서 조회하지 않았다(회원 수 등은 보고서 2026-10-21 값).
> - 이 문서는 **사실(지금 코드에 있는 것)** 만 적는다. 추천·계획은 §6에 따로 두고, 실제 구현·배포 전에는 표의 칸을 바꾸지 않는다.
> - 관계 문서: 전체 비교 [프로그램 비교표](PROGRAM_CAPABILITY_MAP.md), 작업 목록 [데이터수집 통합 작업표](SCRAPING_CONSOLIDATION_TASKS.md), 공용 기준 코드 [`SHARED_FEATURE_MAP.md`](SHARED_FEATURE_MAP.md)·[`SHARED_MODULES.md`](SHARED_MODULES.md), 카테고리 위치 [`CATEGORY_GUIDE_MAP.md`](CATEGORY_GUIDE_MAP.md).

## 0. 이 문서를 쓰는 법

1. **개발 전:** §2에서 만들려는 기능이 이미 있는지 찾는다. 있으면 §4의 기준 코드 위치를 읽고 가져다 쓴다(새로 짜지 않음).
2. **넣을 곳 판단:** 여러 페이지를 반복해 모아 엑셀로 받는 일이면 「대량 수집」(크롤링 서버), 한 페이지를 해부·부분 추출하는 일이면 「한 페이지 분석」(웹앱 안). 옛 Website Scraper 폴더에는 새 기능을 넣지 않는다.
3. **개발 후(같은 커밋):** 바뀐 칸을 §2에서 고치고(칸에 버전 표시), 새 기준 코드는 §4에, 이력은 §7에 한 줄 추가한다. 배포 전 기능은 칸을 바꾸지 말고 §6에 「미배포」로 적는다.
4. 공용 문서처럼 여러 세션이 고칠 수 있으므로 `node scripts/safe-commit.mjs --begin docs/SCRAPING_FEATURE_MATRIX.md --as <세션>` → 수정 → `node scripts/safe-commit.mjs "<메시지>" docs/SCRAPING_FEATURE_MATRIX.md --as <세션>`으로 커밋한다.

## 1. 프로그램 정의·장단점

| 약칭 | 프로그램 (slug · 폴더 · 코드 버전) | 역할 | 핵심 흐름 | 저장 / AI / 키 | 장점 | 단점·한계 | 판정 | 권한 회원(보고서 10-21) |
|---|---|---|---|---|---|---|---|---|
| 대량 수집 | 웹 크롤링 자동화 「작업」(`web-crawler-saas` · `web-crawler/webapp` + `web-crawler/service` · v1.10, BEST) | 여러 페이지 반복 수집 **기준** | 주소 + 모을 항목 → robots 확인 → AI가 반복 영역·항목 위치 찾기 → 최대 5쪽·2,000건 수집 → 엑셀 → 비공개 저장 | DB `web_crawler_jobs`·비공개 버킷·30일 삭제 / 4사 / 서버 본인 키(작업마다 전달, 저장 안 함) | 4사 선택, 차단 시 「확인 대기」, 동적 화면 자동 전환, 같은 도메인 구조 재사용, 개인정보 경고, 10분 임시 내려받기 | 도메인 구조 캐시가 회원 공용(#8), `Crawl-delay` 미반영, 이미지 받기 없음, 크롤링 서버가 별도(Render) 배포, Next.js 16.2.11(보안 업데이트 미적용) | 독립(기준) | 261 |
| 한 페이지 분석 | 웹 크롤링 자동화 「🔎 한 페이지 분석」(`/inspect`, v1.09부터) | 한 페이지 해부·부분 추출 **기준** | 주소 → 7탭(개요·AI 분석·구조·글목록·표·링크·이미지) → 화면에서 영역 선택 → AI로 반복 목록 표 → CSV·이미지 ZIP | **저장 없음**(브라우저 화면만, AI 사용 기록만 남김) / 4사 / 서버 본인 키 | 사설망 차단·DNS 고정 안전 수집, 격리 미리보기, 옛 앱의 키 노출 제거 | robots 확인 없음, 정적 HTML만(동적 화면 약함), 결과를 다시 열 수 없음 | 독립(대량 수집과 같은 앱) | 위와 같음 |
| 옛 스크래퍼 | Website Scraper(`website-scraper` · `ghost-scraper/` · 코드 v1.14) | 병합 원본 — **기능 중지** | 첫 화면·`/guide`는 이동 안내(`src/components/MovedNotice.tsx`), API 4개는 410 | (병합 전) 설정·이력 브라우저 `localStorage`, Gemini 하나, 키 원문을 브라우저로 받음 | (병합 전) 7탭·영역 선택·AI 목록 표·ZIP — 모두 한 페이지 분석으로 옮김 | 옛 코드(`ScraperWorkspace` 등) 남아 있음, `/login` 404 확인 필요(보안 분담표 묶음 C) | 병합 → 한 페이지 분석(2026-10-21) | 178(모두 대량 수집 권한 보유) |

공통: 둘 다 로그인 + 공통 권한 판정(정지 → 관리자 → 핸드폰 → FREE → 구독 → 등급+기간)과 회원 본인 키를 쓴다. 공용 사용 기록은 웹 크롤링 1건 외에는 비어 있어(보고서 10-21) 사용 추이로는 판단할 수 없다.

## 2. 기능 상세 비교표

○ 있음 · △ 일부 · × 없음 · 「중지」는 코드가 남아 있지만 API가 410이라 동작하지 않음 · 「미확인」은 코드로 확인하지 못한 칸. 옛 스크래퍼 칸의 괄호 값은 병합 전(v1.12) 기능이다.

### 2-1. 입력·대상

| 기능 | 대량 수집 | 한 페이지 분석 | 옛 스크래퍼 |
|---|---|---|---|
| 주소 1개 입력 | ○ | ○ | 중지 (○) |
| 모을 항목을 말로 적기(쉼표) | ○ `validation.ts` `parseTargetFields` | × | 중지 (×) |
| 여러 주소 한 번에 넣기 | × | × | 중지 (×) |
| 다음 페이지 따라가기 | ○ 최대 5쪽 `next_page_selector` | × | 중지 (×) |
| 최대 수집 건수 지정 | ○ 1~2,000 | × | 중지 (×) |
| 화면에서 영역 눌러 그 부분만 | × | ○ `SectorModal.tsx` | 중지 (○) |
| 로그인 필요한 페이지 | × (쿠키 안 받음) | × | 중지 (×) |

### 2-2. 가져오기·차단 처리

| 기능 | 대량 수집 | 한 페이지 분석 | 옛 스크래퍼 |
|---|---|---|---|
| 정적 HTML 가져오기 | ○ `plain_get` | ○ `safeFetch` | 중지 (○) |
| 동적 화면(브라우저 렌더) 자동 전환 | ○ 1,500자 미만이면 `plain_dynamic` | × | 중지 (×) |
| 사설망·내부 주소 차단 | ○ `validate_url` | ○ DNS 검사·연결 고정·리디렉트 5회 | 중지 (○ v1.12) |
| robots.txt 확인 | △ 첫 주소만, 막히면 실패 | × | 중지 (×) |
| robots `Crawl-delay` 반영 | × (읽기만, 고정 1.5초) | × | 중지 (×) |
| 요청 속도·횟수 제한 | ○ `RateLimiter` 1.5초·500회·연속 오류 3회 | △ 한 번에 한 페이지(사람이 누를 때만) | 중지 (미확인) |
| 차단 감지 → 「확인 대기」로 멈춤 | ○ `BlockedNeedsConfirmation` | × (오류 문구만) | 중지 (×) |
| 회원이 고른 뒤 우회 시도 | ○ curl_cffi → StealthyFetcher(`escalation.py`) | × | 중지 (×) |
| 고급 봇 차단 즉시 안내 | ○ `looks_like_akamai` | × | 중지 (×) |
| 작업 취소 | ○ `cancelJobAction` | — (즉시 처리) | 중지 (—) |

### 2-3. AI 구조 파악·정리

| 기능 | 대량 수집 | 한 페이지 분석 | 옛 스크래퍼 |
|---|---|---|---|
| AI 공급사 | ○ 4사(OpenAI·Claude·Gemini·Perplexity) `service/llm.py` | ○ 4사 `lib/inspect/ai.ts` | 중지 (△ Gemini 하나, 키를 주소 뒤에 붙여 호출 `lib/gemini.ts`) |
| 모델 단계 선택 | ○ 가성비·균형·고급 `lib/ai/models.ts` | ○ 같은 목록 | 중지 (× 고정) |
| AI가 반복 영역·항목 셀렉터 찾기 | ○ `extract_selectors` | × | 중지 (×) |
| AI가 반복 목록을 표로 정리 | × (셀렉터로 직접 추출) | ○ `/api/inspect/ai` | 중지 (○) |
| 같은 도메인 구조 재사용 | ○ `domain_cache.py` (**회원 공용**, #8) | × | 중지 (×) |
| 구조가 바뀌면 캐시 버리고 다시 파악 | ○ `invalidate` | — | — |
| 회원 키를 서버에서만 사용 | ○ | ○ | 중지 (× 브라우저로 원문 전달 — v1.13에서 410) |
| 키 없으면 등록 안내 | ○ 「본인 키를 등록해주세요」 | ○ 키 있는 공급사만 표시 | 중지 (미확인) |

### 2-4. 결과·내보내기

| 기능 | 대량 수집 | 한 페이지 분석 | 옛 스크래퍼 |
|---|---|---|---|
| 엑셀 | ○ `scripts/export_excel.py` | × | 중지 (×) |
| CSV | × | ○ 탭별 `lib/inspect/csv.ts` | 중지 (○) |
| 이미지 일괄 ZIP | × | ○ JSZip + `/api/inspect/image` | 중지 (○) |
| JSON 내보내기 | × | × | 중지 (○ `ScraperWorkspace.tsx`) |
| 메타·제목 구조·표·링크·이미지 탭 | × | ○ 7탭 `InspectTabs.tsx` | 중지 (○) |
| 결과 미리보기 표(화면) | × (엑셀만, `IMPROVEMENTS.md` #7 제안) | ○ | 중지 (○) |
| 개인정보 섞임 경고 | ○ `detect_pii` → 목록 표시 | × | 중지 (×) |
| 다른 프로그램으로 넘기기 | × | × | 중지 (×) |

### 2-5. 저장·보안·운영

| 기능 | 대량 수집 | 한 페이지 분석 | 옛 스크래퍼 |
|---|---|---|---|
| 결과 서버 저장(회원별 RLS) | ○ `web_crawler_jobs` 본인 조회·추가 | × 저장 안 함 | 중지 (× 브라우저) |
| 결과 파일 비공개 + 본인 확인 임시 주소 | ○ 10분 (v1.10) | — | — |
| 30일 자동 삭제 | ○ `/api/cron/purge-expired` 매일 03:17(KST) | — (저장 없음) | — |
| 작업 상태 표시·자동 새로고침 | ○ 작업 목록 5초마다(`JobsList.tsx`) · △ 대시보드는 새로고침 없음 | — | — |
| 미리보기 격리(sandbox, same-origin 없음) | — | ○ `/api/inspect/proxy` | 중지 (○ v1.12) |
| 사용 기록 | ○ `create_job` | ○ `inspect_ai`(AI 호출 때만) | 중지 (×) |
| 모든 API 권한 확인 + 캐시 끄기 두 줄 | ○ | ○ | 중지 (○ v1.12) |
| 휴대폰 ☰ 메뉴·📖 `/guide` | ○ `Sidebar.tsx` 140행·`/guide` | ○ 같은 앱 | 중지 (○ 안내만) |
| Next.js 보안 업데이트(16.4.2) | × 16.2.11 | × 같은 앱 | ○ 16.4.2(v1.14) |

## 3. 고유 기능 (한 곳에만 있는 것) — 가져올 때 출처

| 기능 | 있는 곳 | 비고 |
|---|---|---|
| 차단 「확인 대기」 → 회원 선택 → 우회 단계 | 대량 수집 `service/pipeline.py`·`service/escalation.py`·`webapp/src/lib/actions/jobs.ts` `resumeJobAction` | 새 수집기에 차단 처리를 넣을 때 그대로 따른다 |
| AI 셀렉터 찾기 + 다음 페이지 | 대량 수집 `service/llm.py` `extract_selectors`·`service/pipeline.py` `_crawl` | AI 1회로 구조를 찾고 나머지는 셀렉터로 수집(비용 낮음) |
| 개인정보 감지 | `web-crawler/scripts/utils.py` `detect_pii` | 이메일·전화번호 등 정규식 |
| 화면 영역 선택 | 한 페이지 분석 `webapp/src/components/inspect/SectorModal.tsx` + `/api/inspect/proxy` 주입 스크립트 | 격리 규칙(§2-5)과 한 세트 |
| 이미지 일괄 ZIP | 한 페이지 분석 `webapp/src/components/inspect/InspectTabs.tsx`(JSZip) + `/api/inspect/image` | 이미지 주소도 `safeFetch`로 받음 |
| 비공개 결과 + 10분 임시 주소 | `webapp/src/app/api/jobs/[id]/download/route.ts` | 회원 파일을 내려주는 다른 프로그램도 같은 방식 권장 |

## 4. 기능별 기준 코드 위치 (새로 만들기 전에 읽을 곳)

경로는 모두 2026-10-24 저장소에서 존재를 확인했다(앞의 `web-crawler/`는 생략한 곳이 있음).

| 기능 | 기준 코드 | 함께 볼 것 |
|---|---|---|
| 권한 판정(페이지·서버 액션 / API) | `web-crawler/webapp/src/lib/access.ts` | `CLAUDE.md` 멀티테넌시 원칙 1·6 |
| 회원 본인 키 읽기·라벨 | `web-crawler/webapp/src/lib/apiKeys.ts`, `web-crawler/webapp/src/lib/apiKeyLabels.ts` | 설정 화면 `webapp/src/app/(dashboard)/settings/page.tsx`, `components/settings/ApiKeyRow.tsx` |
| AI 모델 목록(4사·3단계) | `web-crawler/webapp/src/lib/ai/models.ts` | 서버 호출 형식 `web-crawler/service/llm.py` |
| 입력 검증(주소·항목·건수) | `web-crawler/webapp/src/lib/validation.ts` | `components/jobs/JobForm.tsx` |
| 작업 만들기·우회·취소 | `web-crawler/webapp/src/lib/actions/jobs.ts` | 크롤링 서버 진입점 `web-crawler/service/main.py`(공유 비밀값 확인) |
| 수집 파이프라인 | `web-crawler/service/pipeline.py` | `web-crawler/scripts/utils.py`(`validate_url`·`check_robots`·`detect_softblock`·`RateLimiter`·`detect_pii`) |
| 우회 단계 | `web-crawler/service/escalation.py` | `.claude/skills/web-crawler/references/antibot-strategies.md`(운영자 CLI 문서) |
| 도메인 구조 캐시 | `web-crawler/service/domain_cache.py` | 표 정의 `webapp/supabase/migrations/0002_captcha_gate_and_domain_cache.sql`, 결정 대기 `IMPROVEMENTS.md` #8 |
| 엑셀 만들기 | `web-crawler/scripts/export_excel.py` | 시험 `scripts/test_export_excel.py` |
| 안전 수집(사설망·DNS 고정) | `web-crawler/webapp/src/lib/inspect/safeFetch.ts` | 원본 `ghost-scraper/src/lib/safeFetch.ts`(v1.12) |
| 한 페이지 파싱(7탭) | `web-crawler/webapp/src/app/api/inspect/route.ts` | 형식 `webapp/src/lib/inspect/types.ts` |
| 격리 미리보기 | `web-crawler/webapp/src/app/api/inspect/proxy/route.ts` | `components/inspect/SectorModal.tsx` |
| AI 목록 표 | `web-crawler/webapp/src/app/api/inspect/ai/route.ts`, `web-crawler/webapp/src/lib/inspect/ai.ts` | — |
| CSV | `web-crawler/webapp/src/lib/inspect/csv.ts` | — |
| 결과 내려받기(비공개) | `web-crawler/webapp/src/app/api/jobs/[id]/download/route.ts` | `webapp/supabase/migrations/20261023170000_web_crawler_v1_10_private_results.sql` |
| 상태 확인·자동 새로고침 | `web-crawler/webapp/src/app/api/jobs/[id]/status/route.ts`, `webapp/src/components/jobs/JobsList.tsx` | — |
| 30일 삭제 | `web-crawler/webapp/src/app/api/cron/purge-expired/route.ts` | `webapp/vercel.json`(`17 18 * * *` UTC) |
| 작업 표·RLS | `web-crawler/webapp/supabase/migrations/0001_web_crawler_jobs.sql` | — |
| 이동 안내 화면(병합 원본용) | `ghost-scraper/src/components/MovedNotice.tsx`, `ghost-scraper/src/app/api/crawl/route.ts`(410) | 다른 병합 때 옛 앱 처리 본보기 |

## 5. 병합·독립 방향 (결정된 것)

- **A. 웹 데이터 수집(완료, 2026-10-21):** Website Scraper → 웹 크롤링 자동화 「🔎 한 페이지 분석」. 웹 크롤링 v1.09 · Website Scraper v1.13(안내·숨김, DB `is_active=false`). 근거: 보고서 §2·§6, `web-crawler/supabase/migrations/20261021_merge_a_v1_09.sql`.
- 이 카테고리의 나머지 병합(B 글쓰기·C 프롬프트·D 웹 UI)은 끝났고, 해당 프로그램들은 카테고리를 옮기는 중이라 이 문서 대상이 아니다([통합 작업표](SCRAPING_CONSOLIDATION_TASKS.md) 참고).
- 새 수집 기능은 **웹 크롤링 자동화 한 앱 안에** 넣는다. 데이터 수집용 새 프로그램을 따로 만들지 않는다(필요해 보이면 이 문서 §1과 비교표를 근거로 주인님께 먼저 여쭌다).

## 6. 확장 후보·로드맵 (추천 — 구현 전)

칸을 바꾸지 않은 추천이다. 구현하려면 플랜을 먼저 주인님께 보고한다.

| # | 후보 | 이유 | 근거 | 비고 |
|---|---|---|---|---|
| R1 | 한 페이지 분석에 robots.txt 확인 | 완성 기준 조건 4 | §2-2 | 막히면 분석 중지 + 안내 |
| R2 | `Crawl-delay` 반영(1.5초보다 길면 그 값) | 사이트 요청 존중 | `check_robots`가 이미 값을 돌려줌 | 크롤링 서버 재배포 필요 |
| R3 | 다음 페이지 주소도 robots 확인 | 같은 사이트라도 경로별로 다름 | `pipeline.py` 반복문 | R2와 함께 |
| R4 | 도메인 구조 캐시 회원별(`user_id`) 또는 끄기 | 최상위 규칙 | `IMPROVEMENTS.md` #8 | **주인님 결정 대기**, DB 구조 변경 |
| R5 | 웹앱 Next.js 16.4.2 보안 업데이트 | 알려진 취약점 | 보안 분담표 묶음 E | 빌드 1회 비용 |
| R6 | 완료 엑셀 화면 미리보기 표 | 한 페이지 분석 표 컴포넌트 재사용 | `IMPROVEMENTS.md` #7 | — |
| R7 | 대시보드 자동 새로고침 | 작업 목록만 5초 새로고침 | `IMPROVEMENTS.md` #6(일부 이미 있음) | — |
| R8 | 결과를 블로그·SEO 도구로 넘기기 | 수집 → 글감 연결 | `IMPROVEMENTS.md` #4·#7 | 요약·참고 자료로만(완성 기준 §4-2) |
| R9 | 한 페이지 분석에 동적 화면 처리 | 정적 HTML만 읽음 | §2-2 | 서버리스에서 브라우저 실행 비용 검토 필요 |
| R10 | 옛 `ghost-scraper` 코드 정리 | 쓰지 않는 코드 | `ghost-scraper/AGENTS.md` v1.13 | 백업 폴더 + git 태그 뒤(폐지 프로그램 규칙) |

### 미배포 대기 (데이터수집)

- 없음으로 보인다(2026-10-24 `git log`상 v1.10 배포 기록 `8515b3bdf`). 담당 세션이 확인한다.

## 7. 변경 이력

- 2026-10-24 초안 작성(claude-win-dotori [역할: analysis-planning]). 코드·DB·배포 변경 없음.
