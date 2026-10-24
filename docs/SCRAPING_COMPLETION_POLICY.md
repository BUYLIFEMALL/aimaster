# 데이터수집 자동화 완성 기준

> **상태: 초안(2026-10-24, 작성 claude-win-dotori [역할: analysis-planning]) — 담당 세션 확인 전.** 이 카테고리에는 아직 담당 역할이 없다([카테고리 지침 지도](CATEGORY_GUIDE_MAP.md) 「데이터수집|기획」 줄). 담당이 정해지면 그 세션이 코드와 대조해 확인하고 이 줄을 「확정(날짜·세션)」으로 바꾼다. 확정 전에도 아래 「하지 않을 것」은 기존 최상위 규칙에서 온 것이므로 그대로 지킨다.

- 대상 카테고리: 「데이터수집」(옛 이름 「데이터수집|기획」, 내부 slug `scraping&plan`). 2026-10-24 기준 남은 프로그램은 **웹 크롤링 자동화(`web-crawler-saas`, 폴더 `web-crawler/webapp` + 크롤링 서버 `web-crawler/service`)** 하나이고, **Website Scraper(`website-scraper`, 폴더 `ghost-scraper/`)** 는 2026-10-21 병합 A로 합쳐져 숨김 상태다. 기획·문서·화면 도구는 다른 카테고리로 옮겨졌다(아래 「적용 범위」).
- 근거 문서: [스크래핑 통합 분석 보고서](analysis-scraping-consolidation-20261021/REPORT.md), [데이터수집 기능 상세 비교표](SCRAPING_FEATURE_MATRIX.md), [데이터수집 통합 작업표](SCRAPING_CONSOLIDATION_TASKS.md), `web-crawler/AGENTS.md`, `web-crawler/IMPROVEMENTS.md`.
- 형식은 [블로그·티스토리 자동화 완성 기준](BLOG_AUTOMATION_COMPLETION_POLICY.md)을 따랐다. 내용은 데이터수집에 맞게 새로 썼다.

## 1. 적용 범위와 목표

웹페이지에서 데이터를 모으는 모든 프로그램(대량 수집·한 페이지 분석·앞으로 새로 만들 수집기)의 신규 개발·기능 추가·병합 비교에 적용한다.

**완성 목표 흐름:** 회원이 주소와 모을 항목을 입력 → 수집 전 안전 확인(주소 검사·robots.txt·사설망 차단) → AI가 페이지 구조를 파악(회원 본인 키) → 수집(여러 페이지·건수 상한·속도 제한) → 차단을 만나면 멈추고 회원에게 물음 → 결과 정리(엑셀·CSV·표) → **회원별 비공개 저장** → 회원 본인만 내려받기 → **30일 뒤 자동 삭제**.

- 원래 이 카테고리에 있던 `ai-prompt-studio`(🆕 AI 프롬프트 후보)·`ai-writing-editor`·`markdown-studio`·`ai-slide-builder`(업무자동화)·`ui-canvas`(디자인)·`cinematic-storyboard-studio`(이미지, 2026-10-21 이동 완료)는 데이터 수집 도구가 아니므로 이 기준을 적용하지 않는다. 옮기기 결정 상태는 [카테고리 지침 지도](CATEGORY_GUIDE_MAP.md) 57~64행을 따른다.
- `web-crawler/` 최상위의 파이썬 CLI 도구(`scripts/`, `fingerprints/`, `.claude/skills/web-crawler`)는 **운영자가 자기 PC에서 쓰는 개발 도구**이며 회원 기능이 아니다. 회원 기능은 웹앱과 크롤링 서버뿐이다. CLI의 규칙(통지 게이트·쿠키 사용 등)을 회원 웹앱으로 옮길 때는 이 문서 §3을 먼저 대조한다.

## 2. 끝났다고 말할 조건

수집 프로그램 작업은 아래가 **모두** 확인돼야 「완성」으로 보고한다. 하나라도 빠지면 빠진 단계를 「미완료」로 적는다.

| # | 조건 | 지금 근거(웹 크롤링 자동화) |
|---|---|---|
| 1 | 로그인 + 프로그램 이용 권한 확인이 화면·서버 액션·모든 API에 있다 | `webapp/src/lib/access.ts`(`requireProgramAccess`·`checkProgramAccessApi`, 정지 → 관리자 → 핸드폰 → FREE 순서) |
| 2 | AI 호출은 **회원 본인 키를 서버에서만** 쓴다. 키가 없으면 「본인 키를 등록해 주세요」로 멈춘다(다른 키로 대신하지 않음) | `webapp/src/lib/actions/jobs.ts`(`resolveApiKey` → 없으면 오류 문구), `webapp/src/app/api/inspect/ai/route.ts` |
| 3 | 수집 전 주소 검사: 형식 확인 + 사설망·내부 주소 차단 + 리디렉트 재검사 | 서버 `scripts/utils.py` `validate_url`, 한 페이지 분석 `webapp/src/lib/inspect/safeFetch.ts`(DNS 고정·리디렉트 5회 상한) |
| 4 | robots.txt가 막은 곳은 자동으로 수집하지 않는다 | 대량 수집 `service/pipeline.py` `_crawl`의 `check_robots` → 막히면 실패 처리. **한 페이지 분석은 robots 확인 없음(미구현)** |
| 5 | 건수·페이지·속도 상한이 있다 | `service/pipeline.py` `MAX_PAGES = 5`·`MAX_ROWS = 2000`, `RateLimiter(delay=1.5, max_requests=500, max_consecutive_errors=3)`, `webapp/src/lib/validation.ts` `MAX_ROWS_CEILING = 2000` |
| 6 | 차단(CAPTCHA·방화벽)을 만나면 자동으로 넘어가지 않고 「확인 대기」로 멈춰 회원이 고르게 한다. 고급 봇 차단(Akamai)은 바로 실패로 알린다 | `service/pipeline.py` `BlockedNeedsConfirmation`·`looks_like_akamai`, 웹 `resumeJobAction`(`webapp/src/lib/actions/jobs.ts`) |
| 7 | 수집 0건이면 멈추고 알린다 | `service/pipeline.py` 「수집된 데이터가 없습니다」 |
| 8 | 개인정보(이메일·전화번호 등)가 섞이면 경고를 표시한다 | `scripts/utils.py` `detect_pii` → `web_crawler_jobs.pii_warning` → `webapp/src/components/jobs/JobsList.tsx` 105행 |
| 9 | 결과는 회원별로 비공개 저장하고 본인만 내려받는다 | 표 `web_crawler_jobs` RLS(본인 조회·추가만, `webapp/supabase/migrations/0001_web_crawler_jobs.sql`), 비공개 버킷 + 10분 임시 주소(`webapp/src/app/api/jobs/[id]/download/route.ts`, v1.10) |
| 10 | 생성일 30일 뒤 결과 파일과 작업 기록을 자동 삭제한다 | `webapp/src/app/api/cron/purge-expired/route.ts`(`RETENTION_DAYS = 30`) + `webapp/vercel.json` 매일 실행 |
| 11 | 진행 상태(대기·진행·확인 대기·완료·실패)를 화면에서 볼 수 있다 | `webapp/src/components/jobs/JobsList.tsx`(5초마다 상태 확인), `webapp/src/app/api/jobs/[id]/status/route.ts` |
| 12 | 검수는 실제 화면(Claude Code는 크롬, Codex는 엣지, agy는 웨일)에서 시험 계정으로, 비용이 드는 AI 호출은 최소 횟수로 한다 | 각 버전 인수인계(`web-crawler/AGENTS.md` v1.09·v1.10) |

**아직 「완성」으로 볼 수 없는 부분(2026-10-24 코드 기준):**
- 한 페이지 분석(`/inspect`)에 robots.txt 확인이 없다(조건 4).
- robots.txt의 `Crawl-delay` 값을 읽기만 하고(`check_robots`가 돌려줌) 수집 속도에는 쓰지 않는다 — 속도는 고정 1.5초(조건 5 보강 대상).
- robots.txt 확인은 첫 주소만 하고, 다음 페이지 주소는 다시 확인하지 않는다.
- 도메인 구조 캐시(`web_crawler_domain_profiles`)가 회원 공용이다 — 최상위 규칙의 「전역 생성 캐시 예외 금지」와 부딪혀 주인님 결정 대기(`web-crawler/IMPROVEMENTS.md` #8).
- 웹앱의 Next.js가 `16.2.11`로 보안 업데이트(16.4.2)에서 빠져 있다(`docs/HANDOFF_20261023_NEXTJS_SECURITY_SPLIT.md` 묶음 E).

## 3. 회원이 고르는 항목

| 항목 | 회원이 고르는 것 | 지금 상태 |
|---|---|---|
| 수집 주소·모을 항목 | 주소 1개, 항목은 쉼표로 여러 개(예: 상품명, 가격) | ○ `webapp/src/components/jobs/JobForm.tsx`, `webapp/src/lib/validation.ts` |
| AI 공급사·모델 | OpenAI·Claude·Gemini·Perplexity 중 본인 키가 있는 곳, 가성비·균형·고급 단계 | ○ `webapp/src/lib/ai/models.ts` |
| 최대 수집 건수 | 1~2,000건 | ○ `webapp/src/lib/validation.ts` |
| 차단을 만났을 때 | 「우회 시도」 또는 「취소」(성공 보장 없음 안내) | ○ `resumeJobAction`·`cancelJobAction` |
| 한 페이지 분석 범위 | 페이지 전체 7탭 / 화면에서 영역을 눌러 그 부분만 / AI로 반복 목록을 표로 | ○ `webapp/src/components/inspect/*` |
| 내보내기 형식 | 대량 수집은 엑셀, 한 페이지 분석은 CSV·이미지 ZIP | ○ `scripts/export_excel.py`, `webapp/src/lib/inspect/csv.ts`, `InspectTabs.tsx`(JSZip) |
| 보관 기간 | 회원이 고르지 않는다 — 30일 고정(최상위 규칙) | — |

회원이 고르지 않은 방식으로 수집하지 않는다. 특히 「우회 시도」는 회원이 그 작업에서 직접 누른 경우에만 실행한다.

## 4. 하지 않을 것

아래는 새 기능 제안·병합·외부 프로그램 분석에서 다시 제안하지 않는다. 바꿔야 할 이유가 생기면 구현 전에 주인님께 먼저 여쭌다.

1. **robots.txt가 막은 경로를 자동 수집하지 않는다.** CLI 도구처럼 「묻고 진행」 방식도 회원 웹앱에는 넣지 않는다(지금 웹앱은 막히면 실패 처리 — 이 동작을 유지).
2. **약관 위반을 부추기는 수집을 기능으로 만들지 않는다** — 경쟁사 콘텐츠 전문 복제·재배포를 목적으로 한 기능(본문 통째 복사 대량 저장, 자동 재게시 연결 등)을 만들지 않는다. 블로그 등으로 넘길 때는 요약·참고 자료로만 넘긴다.
3. **로그인이 필요한 남의 데이터를 수집하지 않는다.** 회원 웹앱은 쿠키·세션·아이디·비밀번호를 받지 않고 보내지 않는다(지금 `safeFetch`는 쿠키를 보내지 않음). 회원 본인 계정의 데이터라도 공식 API가 있으면 공식 API로 만든다.
4. **CAPTCHA를 프로그램으로 풀지 않는다.** CAPTCHA 풀이 서비스 연결도 하지 않는다.
5. **고급 봇 차단(Akamai 등)을 서버에서 뚫으려 하지 않는다** — 지금처럼 바로 「지원 범위 밖」으로 알린다.
6. **개인정보 대량 수집 기능을 만들지 않는다** — 이메일·전화번호·주민번호 목록 모으기를 목적으로 한 프리셋·안내를 만들지 않고, 섞여 들어오면 경고한다. 경고를 끄는 설정도 만들지 않는다.
7. **운영자 키·다른 회원 키로 대신 수집하지 않는다.** 크롤링 서버에 회원 키를 저장하지 않는다(지금은 작업마다 받아 쓰고 저장하지 않음 — `service/main.py` 주석).
8. **회원 키 원문을 브라우저로 보내지 않는다** — 옛 Website Scraper의 `/api/user/key` 방식을 다시 만들지 않는다(v1.13에서 410으로 막음).
9. **수집 결과를 회원끼리 공유·재사용하지 않는다** — 공개 버킷, 회원 공용 결과 캐시, 「다른 회원이 이미 모은 데이터 재사용」을 만들지 않는다. 도메인 구조 캐시(#8)는 주인님 결정 전까지 새로 늘리지 않는다.
10. **미리보기에서 남의 사이트 스크립트를 우리 도메인 권한으로 실행하지 않는다** — `CSP: sandbox allow-scripts`를 유지하고 `allow-same-origin`을 넣지 않는다(`webapp/src/app/api/inspect/proxy/route.ts`).
11. **사설망·내부 주소(서버 메타데이터 주소 포함)에 접속하지 않는다** — 새 수집 경로도 `safeFetch` 또는 `validate_url`을 거친다.
12. 좋아요·팔로우·댓글처럼 순위에 영향을 주는 대량 동작은 이 카테고리 범위가 아니다([`PLATFORM_PATTERNS.md`](PLATFORM_PATTERNS.md) §20 규칙 5).

## 5. 수집 결과 저장·30일 삭제

- 저장 위치: 작업 기록은 `web_crawler_jobs`(회원 `user_id` + RLS), 결과 파일은 비공개 버킷 `web-crawler-results`의 `<user_id>/<job_id>.xlsx`.
- 내려받기: 로그인·이용 권한·본인 작업·완료·30일 이내를 확인한 뒤 10분짜리 임시 주소로만 준다.
- 삭제: 생성일 30일이 지나면 파일을 먼저 지우고 기록을 지운다. 파일 삭제가 실패하면 기록을 남겨 다음 날 다시 시도한다.
- 한 페이지 분석 결과는 서버에 저장하지 않는다(브라우저 화면에만 있고 닫으면 사라짐). 서버에 남기는 것은 AI 사용 기록(`usage_logs`, `inspect_ai`)뿐이다. 나중에 저장 기능을 넣으면 같은 회원별 RLS + 30일 삭제를 같은 작업에서 넣는다.
- 회원이 직접 만든 설정(예: 즐겨 쓰는 수집 항목 묶음)을 새로 저장하게 되면 생성 데이터와 구분해 보관 기간을 따로 정하고, 정하기 전에 주인님께 여쭌다.

## 6. 개발·비교·완료 보고

1. 기능을 만들기 전에 [기능 상세 비교표](SCRAPING_FEATURE_MATRIX.md) §2에서 이미 있는 기능인지 찾고, §4 기준 코드를 가져다 쓴다.
2. 플랜에는 §2 조건 12개 중 바뀌는 것, 회원이 고르는 항목, 비용(유료 AI 시험 호출 횟수·크롤링 서버 재배포 여부)을 적는다. 크롤링 서버(`web-crawler/service`)는 Vercel이 아닌 별도 서버(Render)라 웹앱 배포와 따로 배포해야 한다.
3. 완료 보고에는 대량 수집·한 페이지 분석 각각의 「수집 전 안전 확인 / 수집 / 차단 처리 / 저장 / 내려받기 / 30일 삭제」 검수 결과를 나눠 적고, 확인하지 못한 단계는 「미검수」로 적는다.
4. 배포한 기능은 같은 커밋에서 비교표 해당 칸과 변경 이력을 고친다.

## 7. 변경 이력

- 2026-10-24 초안 작성(claude-win-dotori [역할: analysis-planning]). 코드·DB·배포 변경 없음.
