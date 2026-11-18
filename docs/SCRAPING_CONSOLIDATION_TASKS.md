# 데이터수집 프로그램 통합·기능 확장 작업표

> **상태: 초안(2026-10-24, 작성 claude-win-dotori [역할: analysis-planning]) — 담당 세션 확인 전.** 진행 상태는 `git log`와 각 프로그램 `AGENTS.md`로 확인했고, 운영 DB는 이번 작성에서 조회하지 않았다. 담당 역할이 정해지면 그 세션이 이어서 관리한다.

대상은 **AIMaster 운영**(공통 DB ref `esgxyikcnnvmlhygjkth`). 이 문서 작성에서는 코드·DB·권한·버전·배포를 바꾸지 않았다.

## 현재 위치와 읽는 순서

1. [데이터수집 자동화 완성 기준](SCRAPING_COMPLETION_POLICY.md) — 끝났다고 말할 조건·하지 않을 것.
2. [데이터수집 기능 상세 비교표](SCRAPING_FEATURE_MATRIX.md) — 지금 있는 기능·기준 코드 위치·확장 후보.
3. 이 작업표 — 묶음 번호와 진행 상태.
4. 1차 근거: [스크래핑 통합 분석 보고서](analysis-scraping-consolidation-20261021/REPORT.md)(2026-10-21, 12개 → 8개 결정, 비교 분석 매뉴얼의 기준 사례).

**2026-10-24 현재:** 「데이터수집」 카테고리에 남은 공개 프로그램은 웹 크롤링 자동화(`web-crawler-saas`) 하나다. Website Scraper(`website-scraper`)는 병합 A로 숨김(`is_active=false`)이다. 보고서가 다룬 나머지 10개는 병합되거나 다른 카테고리로 옮겨졌다.

## 1. 병합 묶음 (보고서 §2·§6 결정)

| 묶음 | 내용 | 진행 | 근거 커밋·버전 | 남은 일 |
|---|---|---|---|---|
| **A 웹 데이터 수집** | Website Scraper → 웹 크롤링 자동화 「🔎 한 페이지 분석」 | ✅ 완료 2026-10-21 | `29f9a3a5c`(기능) · `cbcd8a701`(인수인계) · web-crawler-saas v1.09 · website-scraper v1.13(안내·API 410·숨김) · DB 기록 `web-crawler/supabase/migrations/20261021_merge_a_v1_09.sql` | 옛 `ghost-scraper/` 코드 정리(T-08) |
| B 글쓰기 | 페르소나 문체 → AI 글쓰기 에디터 「🎚️ 문체 바꾸기」 | ✅ 완료 2026-10-21 | `85020e791` · ai-writing-editor v1.11 · persona-style-studio v1.09 | 이 카테고리 밖(업무자동화로 이동) |
| C 프롬프트 | 프롬프트 템플릿 → AI Prompt 「📁 내 템플릿 보관함」 | ✅ 완료 2026-10-21 | `f0a3f529e`·`4f85bbae6` · ai-prompt-studio v1.07 · prompt-template-studio v1.06 | 이 카테고리 밖(AI 프롬프트로 이동) |
| D 웹 UI | AI 웹 UI → UI Canvas 갤러리 + React·Tailwind 코드 내보내기 | ✅ 완료 2026-10-21 | `809264a72`·`160f148fb` · ui-canvas v1.11 · ai-web-ui(`react-ui-showcase`) v1.06 | 이 카테고리 밖(디자인으로 이동) |
| 연결 | 랜딩페이지 기획 → 「UI Canvas로 보내 다듬기」 | ✅ 완료 2026-10-21 | `48fb4c627` · landing-architect v1.11 | — |
| 카테고리 이동 1 | 시네마틱 스토리보드 → 「이미지」 | ✅ 완료 2026-10-21 | DB만(보고서 §6, 백업 `D:\Antigravity\AIMaster_backup\category-move-20261021`) | — |
| 카테고리 이동 2 | `ai-prompt-studio` → 🆕 AI 프롬프트, `ai-writing-editor`·`markdown-studio`·`ai-slide-builder` → 업무자동화, `ui-canvas` → 디자인 | ✅ 완료 2026-10-24 | `2772a096f` · `supabase/migrations/0042_categories_ai_prompt_personality.sql`([카테고리 지침 지도](CATEGORY_GUIDE_MAP.md) 21~26행) | — |
| 이름 변경 | 「데이터수집\|기획」 → 「데이터수집」(slug `scraping&plan` 유지) | ✅ 반영됨 | `supabase/migrations/0045_category_rename_scraping.sql` — 2026-10-24 주인님 승인, 운영 DB 반영 확인(크롬 SQL 편집기 결과 `데이터수집 / scraping&plan`) |

독립으로 남긴 프로그램(보고서 §3): AI 랜딩페이지 기획·AI 슬라이드·마크다운 문서·시네마틱 스토리보드 — 모두 지금은 다른 카테고리라 이 작업표의 대상이 아니다.

## 2. 데이터수집 후속 작업 (번호·진행 상태)

번호 `T-nn`은 이 문서에서 새로 붙였다. 「대기」는 시작 전, 「결정 대기」는 주인님 결정이 먼저 필요한 것이다. 근거와 자세한 이유는 [기능 상세 비교표](SCRAPING_FEATURE_MATRIX.md) §6과 `web-crawler/IMPROVEMENTS.md` 번호를 함께 적었다.

| 번호 | 작업 | 상태 | 근거 | 비용·위험 | 다음 첫 단계 |
|---|---|---|---|---|---|
| T-01 | 결과 버킷 비공개 + 10분 임시 주소 | ✅ 완료 2026-10-23 | `8515b3bdf` · v1.10 · `IMPROVEMENTS.md` #9 | — | 첫 실제 완료 작업이 나오면 내려받기 확인(인수인계에 「미확인」으로 남아 있음) |
| T-02 | 생성 데이터 30일 자동 삭제 | ✅ 완료(코드 v1.08 `9204a3069`, 첫 배포 v1.09) | `IMPROVEMENTS.md` #5 | — | 정리 경로 실행 기록(삭제 건수) 확인 — **확인 필요** |
| T-03 | 도메인 구조 캐시 회원별 전환(주인님 결정 2026-11-18: 회원별로 나누기) | 계획 보완 2026-11-18(회원별 **새 표** 전환안, §2-4) — 실행은 운영 DB·Render 승인 뒤 | `IMPROVEMENTS.md` #8, 비교표 R4 | 새 표 추가 + 크롤링 서버(Render) 재배포 | §2-4 승인 순서 1번(운영 행 수 읽기)부터 Master 배정 |
| T-04 | 웹앱 Next.js 16.2.11 → 16.4.2 보안 업데이트 | ✅ 배포 완료 2026-11-18 web-crawler-saas **v1.13** `web-crawler-saas-ljvtual5y`(소스 `1a03b9734`, 주인님 승인 묶음 3/3) — next 16.4.6(공식 advisory 최소 패치)·eslint-config-next 16.4.6·undici ^7.30.2·zod ^4.6.7 `2b328bbcc`·`840d672ac`. 잔여: source-map-js high(개발 빌드 도구 경유) | `docs/HANDOFF_20261023_NEXTJS_SECURITY_SPLIT.md` 묶음 E(미커밋 `web-crawler/AGENTS.md` 때문에 제외됨 — 그 변경은 빈 줄 1개 삭제뿐) | Vercel 빌드 1회(사전 승인) | 미커밋 변경 주인 확인 → `npm install next@16.4.2` → tsc·build → 배포 |
| T-05 | 한 페이지 분석에 robots.txt 확인 | ✅ 배포 완료 2026-11-18 web-crawler-saas **v1.13** `web-crawler-saas-ljvtual5y`(소스 `1a03b9734`, 주인님 승인 묶음 3/3) — `fc48ebcba`+`8172d8084`, QA023 PASS. 실제 로그인 화면 확인 대기 | 완성 기준 §2 조건 4, 비교표 R1, 아래 §2-1 | 웹앱 배포(모아서 배포, 버전 +0.01은 배포 때) | 다음 web-crawler 묶음 배포 때 함께 내보내고 고지·버전·실제 화면 확인. 미검수: 실제 전송·route 전체·운영 화면 |
| T-06 | `Crawl-delay` 반영 + 다음 페이지 robots 확인 | 대기 | 비교표 R2·R3 | 크롤링 서버 재배포 | `pipeline.py` `RateLimiter` 지연값 계산 플랜 |
| T-07 | 대시보드 자동 새로고침·완료 엑셀 미리보기 | ✅ 배포 완료 2026-11-18 web-crawler-saas **v1.13** `web-crawler-saas-ljvtual5y`(소스 `1a03b9734`, 주인님 승인 묶음 3/3) — 자동 새로고침 `40662e6ae`+`1a54bdd06`(QA029 PASS) · 완료 엑셀 미리보기 `e60083fb5`+F01~F03 `d06842802`+F04 `12e194a47`(맥미니 독립 PASS). 실제 로그인 화면 확인 대기 | `IMPROVEMENTS.md` #6·#7, 비교표 R6·R7, 아래 §2-2 | 웹앱 배포(모아서) | T-05와 함께 다음 web-crawler 묶음 배포 때 버전·화면 확인. 미검수: 실제 HTTP·계정 전환·브라우저 |
| T-08 | 옛 `ghost-scraper/` 코드 정리 | ✅ 정리 완료·미배포 2026-11-18(Master 마감, 선택 다) — 백업 태그 `backup/website-scraper-20261118`(로컬, 원본 `2706fc0b5`)·폴더 `retired-programswebsite-scraper¸6fc0b5` 뒤 19개 삭제 `e038f405e`(§2-3). 로컬 tsc 0·컴파일 통과, 빌드는 기존 Next 16.4.2 보안 차단(SecurityFatalError)으로 중단 — 삭제 결함 아님, 전체 build 성공 아님. **후속(미배포·운영 미수정)**: ghost-scraper next 16.4.2→16.4.6 최소 보안 패치(설치·lock·빌드는 별도 배정). 태그 원격 push 대기 | `ghost-scraper/AGENTS.md` v1.13 「정리는 백업 폴더 + git 태그 뒤」 · 2026-10-24 `D:\Antigravity\AIMaster_backup\retired-programs\`에 없음 · 관련 git 태그 없음 | 주소 유지 필요(옛 주소 안내), 삭제는 사전 승인 | 백업 폴더 복사 + 태그 → 안내 화면·410만 남기고 정리 플랜 |
| T-09 | 옛 Website Scraper `/login` 404 점검 | 대기(다른 묶음 담당) | 보안 분담표 묶음 C | 고치면 빌드 1회 | 묶음 C 담당 세션 결과 확인 |
| T-10 | 수집 결과 → 블로그·SEO 도구로 넘기기 | 대기(아이디어) | `IMPROVEMENTS.md` #4·#7, 비교표 R8 | 완성 기준 §4-2(본문 복제 금지)와 함께 설계 | [공통 아이디어 표](PROGRAM_IDEA_BACKLOG.md)에 등록 여부 확인 |
| T-11 | 프로그램 비교표·카테고리 지도 값 맞추기 | ✅ 문서 정합성 완료(Website Scraper, 2026-11-16 BLOG-20261116-06) | **Website Scraper 확정분(BLOG-20261116-04 대조)**: 병합 완료 2026-10-21(v1.13, `29f9a3a5c`·`cbcd8a701`) · 옛 API 4개 410(코드 확인) · 마지막 배포 v1.15 2026-11-12(`docs/HANDOFF.md` [역할: workspace] 기록, `version.ts` 일치). [프로그램 비교표](PROGRAM_CAPABILITY_MAP.md) 97행(v1.15 · 병합됨·숨김)·472행(배포 기록)과 `ghost-scraper/AGENTS.md` 개요 버전(BLOG-20261116-05)을 맞춤. 카드의 옛 기능 설명은 병합 전 기록으로 보존. 웹 크롤링 값은 이번에 대조하지 않음 | 없음 | 운영 DB 값 확인됨(2026-11-16 WS-20261116-10 `c5bb52b99`: v1.15 · `is_active=false` · 카테고리 백업 비공개). 확정하지 않은 것: 실제 라이브 화면(미확인), T-12 담당 지정(결정 대기) |
| T-12 | 카테고리 담당 역할 지정 | ✅ 배정 2026-11-17 | Master(CX-MASTER-01) msg_228df86d95ed: 데이터수집 카테고리 **문서·요청 조정 담당 = `blog`(CC-BLOG-01)**. 제품 코드 권한·`website-scraper` 재활성화·운영 정책 변경 아님. [카테고리 지침 지도](CATEGORY_GUIDE_MAP.md) 114행 담당 칸 반영 | 없음 | 이 표·비교표 정합성 유지. 코드 작업(T-03~T-08)은 Master 배정 때 따로 |

### 2-1. T-05 구현 준비 (2026-11-17, CC-BLOG-01 [역할: blog], Master `BLOG-20261117-08` 읽기 분석 — 코드·설치·외부 요청·빌드·DB 0)

**지금 요청 경로(코드 확인, `web-crawler/webapp`)**
- 화면 `src/components/inspect/InspectWorkspace.tsx:34` → `POST /api/inspect`(`src/app/api/inspect/route.ts`, 272줄): 권한 확인(`checkProgramAccessApi`) → 주소 정리(`https://` 보정, `new URL`) → `safeFetch(targetUrl)` 1회 → 응답이 `ok`가 아니면 502 → cheerio 파싱. **robots 확인 없음.**
- `safeFetch`(`src/lib/inspect/safeFetch.ts`, 107줄): 공개 주소만 허용(사설망·`localhost`·인증정보 주소 차단), DNS 고정(rebinding 방지), 리디렉트 최대 5회를 직접 따라가며 매번 검사, 기본 제한 20초, 차단은 `BlockedUrlError` → 라우트가 400. 돌려주는 `finalUrl`은 마지막 주소.
- 같은 `safeFetch`를 쓰는 다른 경로: `/api/inspect/proxy`(구역 선택 창 `SectorModal.tsx:66`이 같은 페이지를 다시 불러 미리보기), `/api/inspect/image`(이미지 내려받기). `/api/inspect/ai`는 외부 요청 없음.
- 기존 robots 판정은 **Python에만** 있다: `web-crawler/scripts/utils.py:358` `check_robots`(protego 파서, `*` 에이전트) — 대량 수집 `service/pipeline.py:128`이 막히면 실패 처리. 웹앱(TS)용 공용 함수·npm robots 파서는 저장소에 없음(`webapp/node_modules` 확인). 캐시 없음.
- Python 실패 정책: robots를 못 가져옴(4xx·5xx·연결 오류 포함) → `allowed=true` + `error` 문구 / 404·빈 파일 → 제한 없음 / 파싱 실패 → 허용 + `error`.

**최소 수정 경로 — 2차(2026-11-17 Master msg_0101dd1848c2 결정 반영, 1차 안은 아래 「1차 안의 빈틈」 참고)**

*1차 안의 빈틈:* route에서 첫 주소만 판정하고 `safeFetch` 뒤 `finalUrl`을 다시 보는 방식은, 리디렉트 다음 주소의 **본문을 이미 요청한 뒤** 판정하게 된다 → 「막힌 주소 본문 요청 0회」를 지킬 수 없다. 그래서 판정을 `safeFetch`의 **매 요청 직전**으로 옮긴다.

*바꿀 파일 3개(새 파일 1 + 기존 2) + 시험 파일 1(새):*
1. `webapp/src/lib/inspect/safeFetch.ts`(기존) — `safeFetch(raw, init, opts?)`에 선택 인자 `opts.beforeRequest?: (url: URL, signal: AbortSignal) => Promise<void>` 추가. 호출 위치는 반복문 안 82행 `resolvePublicUrl(current)` **다음**, 93행 `fetch(url, options)` **앞**(첫 주소 포함 모든 요청, 최대 1+5회). 훅이 던지면 그 주소의 본문 요청 없이 끝난다. 기존 것은 그대로: `resolvePublicUrl` 사설망 검사, DNS 고정 `Agent`, `MAX_REDIRECTS = 5`, `redirect: "manual"`, 80행의 한 번 만든 `signal`(20초 전체 제한)을 훅에도 넘긴다. `opts`를 안 넘기는 기존 호출(`proxy`·`image`)은 동작 그대로.
2. `webapp/src/lib/inspect/robots.ts`(새) — `createRobotsGuard(userAgents)` → `beforeRequest` 함수. 요청마다 그 주소의 출처(`scheme://host:port`) robots.txt를 판정하고, **한 번의 분석 안에서만** 출처별 결과를 `Map`에 기억(같은 출처 리디렉트에서 robots를 다시 받지 않음, 저장되는 캐시 아님 — T-03과 무관). robots.txt 자체는 `safeFetch(robotsUrl, { signal: AbortSignal.any([바깥 signal, AbortSignal.timeout(5_000)]) })`로 **훅 없이** 부른다 → 재귀 판정 없음, robots.txt의 리디렉트도 사설망 검사·5회 제한을 그대로 받음. 본문은 500KB까지만 읽는다.
3. `webapp/src/app/api/inspect/route.ts`(기존) — `safeFetch(targetUrl, {...}, { beforeRequest: createRobotsGuard(["WebCrawlerInspect", "*"]) })`로 바꾸고, `RobotsBlockedError`·`RobotsUnavailableError`를 기존 `BlockedUrlError`처럼 잡아 응답 코드로 바꾼다. 응답 성공 JSON에 `robots: { checked: true }`만 더함(기존 칸 불변).
4. `webapp/tests/inspect-robots.test.cjs`(새) — 아래 모의 시험.

*판정 규칙(Master 결정):*
| robots.txt 응답 | 처리 | 회원 응답 |
|---|---|---|
| 200 + 규칙 | 규칙대로. 막히면 `RobotsBlockedError` | 403 「이 사이트의 robots.txt가 이 주소의 자동 분석을 허용하지 않습니다」 |
| 404(규칙 없음)·빈 파일 | 계속 진행 | 지금과 같음 |
| 401·403 | 거절(`RobotsBlockedError`) | 403 같은 문구 |
| 5xx·시간 초과·연결 오류 | 본문 요청 안 함(`RobotsUnavailableError`), **자동 재시도 없음** | 503 「사이트의 robots.txt를 지금 확인할 수 없습니다. 잠시 뒤 다시 시도해 주세요」 |
| 그 밖의 4xx(410·429 등) | **Master 확인 필요** — 제안: 410 등은 404와 같게 진행, 429는 5xx와 같게(본문 요청 안 함) | — |

*사설망 차단:* robots.txt 주소도 `safeFetch`를 지나므로 사설 주소면 `BlockedUrlError`(지금처럼 400).

*파서:* 성숙한 MIT 라이브러리 `robots-parser` 우선. **이번엔 외부 요청 0이라 라이선스·의존성을 확인하지 못함**(저장소 어디에도 사본 없음, `webapp/node_modules`에도 없음). 설치 단계에서 `npm view robots-parser license dependencies` 1회로 「MIT·추가 의존성 0」을 먼저 확인하고, 다르면 설치하지 않고 다시 보고. 설치는 이번에 하지 않음.

**완료 조건**
- 막힌 주소는 **첫 주소든 리디렉트 다음 주소든** 본문 요청 0회(가짜 `fetch` 호출 기록에 그 주소가 없음).
- 404·빈 파일은 지금과 같은 결과. 401·403은 403. 5xx·시간 초과는 503이고 본문 요청 0회, 재시도 0회.
- 기존 SSRF 차단·DNS 고정·리디렉트 5회·20초 전체 제한 유지. `proxy`·`image` 동작 불변.
- robots.txt 요청에는 훅이 다시 걸리지 않음(재귀 0).
- `tsc`·기존 시험 통과, 버전 +0.01은 실제 배포 때 1회(모아서 배포).

**모의 시험(외부 요청 0, `tests/inspect-robots.test.cjs`)** — 기존 방식(`typescript.transpileModule` + `node --test`), `fetch`·DNS 조회를 가짜로 바꿔 요청 주소를 기록: 전체 차단(`Disallow: /`) · 경로 차단 · `Allow`가 더 구체적 · 우리 UA 전용 그룹 · 404 · 빈 파일 · 401 · 403 · 5xx(본문 0·재시도 0) · 시간 초과 · 500KB 초과 · **같은 출처 리디렉트 뒤 막힌 경로(그 주소 본문 0)** · **다른 출처로 리디렉트한 막힌 주소(그 출처 robots만 요청, 본문 0)** · 같은 출처 robots 1번만 요청 · robots.txt 자체가 사설 주소로 리디렉트(400) · robots 요청에 훅 재귀 없음 · `opts` 없는 기존 호출 동작 불변 — 17가지.

**구현 결과(2026-11-17 `fc48ebcba`, Master msg_6bd4fda305a6 배정, CC-BLOG-01)** — 파일 6개: `safeFetch.ts`(선택 인자 `beforeRequest`, 82행 주소 검사 뒤·연결 준비와 본문 요청 앞) · 새 `robots.ts` · `route.ts`(403·503 응답, UA 상수 공용화) · 새 `tests/inspect-robots.test.cjs` · `package.json`(`robots-parser` 정확 `3.0.1` + 시험 명령 `test:inspect-robots`) · 잠금 파일(+10줄). 최종 규칙: 404·410·빈 파일은 진행 / 401·403은 403 / 429·5xx·그 밖의 4xx·연결 오류·시간 초과·512000바이트 초과(흐름 읽기 중단)·판정 불가는 503(본문 0·재시도 0) / robots 쪽 사설망·리디렉트 초과는 차단(400). 판정 토큰 `WebCrawlerInspect` = 실제 요청 UA, 전용 그룹 우선·없으면 `*`(두 그룹 동시 적용 없음). 검증: 모의 시험 25개 통과(실제 parser, 가짜 HTTP·DNS, 외부 요청 0), 기존 `test:work-inbox` 3개 통과, `tsc --noEmit` 오류 0. 파서 출처: `robots-parser` 3.0.1 MIT(Sam Clarke) — `robots.ts` 머리 주석. 외부 크롤링·빌드·배포·DB 0. 실제 화면 확인은 배포 뒤.

**Master 결정(2026-11-17 msg_0101dd1848c2)**: 범위 `/api/inspect`만 · 404는 진행, 401·403은 거절, 5xx·시간 초과는 본문 요청 안 하고 다시 시도 안내(자동 재시도 없음) · 파서는 MIT `robots-parser` 우선(설치 전 라이선스·의존성 확인, 설치는 아직 안 함).
**남은 확인 1개**: 그 밖의 4xx(410·429 등) 처리 — 위 표의 제안.

- 0번 규칙 고지: `node scripts/apply-source-notice.mjs --check web-crawler` → 고칠 곳 0개(읽기만).
- 범위 밖: T-03 캐시 정책, T-04 Next 업그레이드, T-06 `Crawl-delay`, T-08 삭제. 이 폴더의 남의 미커밋 `web-crawler/AGENTS.md`는 그대로 둠.

### 2-2. T-07 대시보드 자동 새로고침 구현 준비 (2026-11-17, CC-BLOG-01 [역할: blog], Master `BLOG-20261117-09` 읽기 분석 — 코드·설치·빌드 0)

**대조 결과: 대시보드에는 자동 새로고침이 없다(기존 기능 아님).** `web-crawler/webapp/src/app/(dashboard)/dashboard/page.tsx`는 서버 화면(`requireUser` → `web_crawler_jobs` 회원 본인 행 조회)으로 상태 카드 5개·「지금 수집 중인 작업」·최근 8개를 한 번만 그린다. 클라이언트 갱신 코드 없음.

**재사용할 기존 갱신(작업 목록)** — `src/components/jobs/JobsList.tsx` 12~51행, 컴포넌트 안에 직접 들어 있음(따로 뺀 훅 아님):
- 진행 중(`pending`·`running`) 작업이 있을 때만 `setInterval` 5초(`POLL_INTERVAL_MS = 5_000`). 없으면 타이머 없음.
- 매번 진행 중 작업마다 기존 API `GET /api/jobs/[id]/status`(`src/app/api/jobs/[id]/status/route.ts`)를 `cache: "no-store"`로 호출. 이 API는 `checkProgramAccessApi()`(로그인+프로그램 권한) 뒤 RLS 일반 클라이언트로 `user_id = 본인` 행만 읽고, 없으면 404.
- 하나라도 진행 중이 아니게 바뀌면 `router.refresh()` 한 번(`refreshedRef`로 중복 방지). 언마운트·`jobs` 변경 때 `clearInterval`.

**기존 갱신의 빈틈(대시보드에 그대로 옮기면 같이 옮겨짐)**
1. 숨은 탭에서도 5초마다 계속 요청(`document.visibilityState` 확인 없음).
2. 앞 요청이 5초 넘게 걸리면 다음 회차가 겹쳐 같은 요청이 동시에 나감(진행 중 표시 없음).
3. 로그아웃·계정 전환으로 401·403·404가 와도 `null`로만 처리해 **멈추지 않고 계속 요청**.

**최소 구현 경로(제안) — 새 API·DB·두 번째 폴링 0**
1. 새 `src/lib/jobs/activeJobsPoller.ts`(React 없는 순수 TS): `createActiveJobsPoller({ ids, fetchStatus, onTransition, intervalMs = 5_000, isVisible, onStop })` → `start()/stop()`. JobsList 지금 규칙 그대로 + 빈틈 3개 보완: 숨은 탭이면 그 회차 건너뜀(보이면 다음 회차부터 재개) · 요청 중이면 그 회차 건너뜀 · 401·403·404면 멈춤(`onStop`) · 전환되면 `onTransition` 한 번 후 멈춤.
2. 새 `src/components/jobs/useActiveJobsRefresh.ts`(훅): 위 poller + `fetch('/api/jobs/${id}/status')` + `router.refresh()` 연결, 언마운트 때 `stop()`.
3. `JobsList.tsx`: 안의 `useEffect` 갱신 코드를 훅 한 줄로 바꿈(동작 같음 + 빈틈 보완).
4. 새 `src/components/jobs/ActiveJobsRefresher.tsx`(`"use client"`, 화면 출력 없음): `ids`만 받아 훅 호출.
5. `dashboard/page.tsx`: `pending`·`running` 작업 id만 넘겨 `<ActiveJobsRefresher ids={...} />` 한 줄(진행 중이 없으면 아무것도 안 그림 → 타이머 0).
- 한 화면에 폴링은 하나다(대시보드는 JobsList를 쓰지 않음). 대시보드와 작업 목록은 다른 주소라 동시에 돌지 않는다.

**완료 조건**
- 대시보드에 진행 중 작업이 있으면 5초마다 기존 상태 API만 호출, 하나라도 끝나면 `router.refresh()` 한 번 → 상태 카드·최근 목록 갱신. 진행 중이 없으면 요청 0.
- 숨은 탭: 요청 0(다시 보이면 이어서). 앞 요청이 안 끝났으면 다음 회차 0. 401·403·404(로그아웃·계정 전환·다른 회원 작업): 멈춤. 언마운트: 타이머·리스너 정리.
- 작업 목록(`/jobs`) 동작은 지금과 같고 빈틈 3개만 보완.
- `tsc`·기존 시험 통과. 버전 +0.01은 배포 때(모아서 배포).

**모의 시험** — 새 `webapp/tests/active-jobs-poller.test.cjs`(기존 방식 `transpileModule` + `node --test`, `node:test`의 가짜 타이머, 가짜 `fetchStatus`): 진행 중 0 → 타이머 0 · 5초마다 호출 · 전환 시 `onTransition` 1번 후 멈춤 · 숨은 탭 회차 요청 0·보이면 재개 · 요청 중 겹침 0 · 401/403/404 멈춤 · 네트워크 오류는 다음 회차 재시도(지금과 같음) · `stop()` 뒤 호출 0. 시험 명령 `test:jobs-poller`를 `package.json`에 추가.

**바뀔 파일(구현 때)**: 새 `src/lib/jobs/activeJobsPoller.ts` · 새 `src/components/jobs/useActiveJobsRefresh.ts` · 새 `src/components/jobs/ActiveJobsRefresher.tsx` · `src/components/jobs/JobsList.tsx` · `src/app/(dashboard)/dashboard/page.tsx` · 새 `tests/active-jobs-poller.test.cjs` · `package.json`(시험 명령 1줄, 설치 0).

**Master 결정(msg_74121752d303)**: 작업 목록도 같은 공용 코드 사용.

**구현 결과(2026-11-17 `40662e6ae`, 7파일 +326 −40)** — 위 경로 그대로. 실패 정책: 401·403·404는 영구 멈춤 / 네트워크 오류·5xx·응답 형식 이상은 일시 실패로 보고 즉시 재시도 없이 다음 5초 회차(진행 중이고 보이는 동안 계속 — 지금 작업 목록과 같음) / 끝난 작업 발견 시 `router.refresh()` 1회 후 멈춤. 세대: ID 세트가 바뀌거나 화면이 사라지면 이전 poller를 `stop()`(요청 `AbortController` 중단) → 늦게 온 응답은 버림. 숨은 탭은 리스너 없이 회차마다 `document.visibilityState`만 확인(정리할 리스너 0). 검증: 구현 전 시험 실패(파일 없음) → 구현 뒤 `test:jobs-poller` 14개 통과(가짜 타이머·지연 응답: 겹침·숨김·늦은 완료·세대 교체·401/403/404·일시 실패·이중 start/stop) · `test:inspect-robots` 30 · `test:work-inbox` 3 · `tsc` 오류 0. `eslint`는 설정 파일이 없어 실행 안 됨. 미검수: 실제 브라우저 화면·실제 세션 전환·운영 배포. 점유 예약: `docs/ACTIVE_WORK.md`에 남의 미커밋 변경이 있어 쓰지 않음.

- 범위 밖: 완료 엑셀 미리보기(T-07 뒷부분), T-03·T-04·T-08. 남의 미커밋 `web-crawler/AGENTS.md` 보존.

### 2-3. T-08 옛 `ghost-scraper/`(website-scraper) 코드 정리 — 실행 안 (2026-11-18, CC-BLOG-01, Master `msg_dce7acccf159` 범위 준비 · 아직 실행 0)

**근거**: 주인님 승인(2026-11-18 채팅 선택창 「T-08 정리 승인」 — 백업 폴더 + git 태그 먼저, 안내 화면·410만 남김). 선례: 상세페이지 EC-W12(2026-10-26, 이동 안내·410만 남기고 쓰지 않는 13개 삭제, 태그 `backup/ec-w12-20261026`), 백업 안내 `D:\Antigravity\AIMaster_backup\retired-programs\README.md`. 운영 상태: v1.15 · `is_active=false` · 카테고리 비공개(WS10 `c5bb52b99`), 라이브 첫 화면 200 이동 안내·`/login` 404(맥미니 `.ai/results/WEBSITE-SCRAPER-20261118-CX-QA-01.md`).

**정확한 원본**: `ghost-scraper/` 마지막 커밋 `2706fc0b5`(폴더 트리 `436c0f813`, 추적 파일 77개). 남의 미커밋 `ghost-scraper/next-env.d.ts`(Next 자동 생성) 1개 — 건드리지 않음.

**1단계 영구 백업(삭제 전)**
- git 태그 `backup/website-scraper-20261118` → 실행 시점의 `ghost-scraper` 마지막 커밋(트리가 `436c0f813`과 같은지 확인 후). 로컬 태그만, **원격 push는 Master 순번 확인 뒤**(공용 master push 금지 유지).
- 백업 폴더(실제) `D:\Antigravity\AIMaster_backup\retired-programs\website-scraper\2706fc0b5\`(실행 커밋 하위 폴더, `MANIFEST.txt` — 바이트 일치 8·CRLF→LF 정규화 뒤 일치 69) ← `git archive <그 커밋> ghost-scraper`로 **추적 파일 77개만** 풀기. 제외: `.env.local`(비밀값)·`.vercel/`·`.next/`·`node_modules/`·`tsconfig.tsbuildinfo` — 모두 `.gitignore` 대상이라 archive에 안 들어감. 같은 폴더 `README.md` 표에 한 줄(프로그램·합쳐진 곳 `web-crawler-saas` `/inspect`·병합일 2026-10-21·정리일·파일 수·태그).

**2단계 삭제 목록(19개, 운영 경로에서 import 0 확인)**
- `src/components/`: `ScraperWorkspace.tsx` · `guide/GuideShell.tsx` · `layout/Header.tsx` · `layout/Sidebar.tsx` · `modals/SectorModal.tsx` · `modals/SettingsModal.tsx` · `scraper/ScraperTabs.tsx` · `scraper/UrlInputSection.tsx` · `ui/KpiCard.tsx` · `ui/PageHero.tsx`
- `src/lib/`: `access.ts` · `auth.ts` · `gemini.ts` · `programAccess.ts` · `safeFetch.ts` · `storage.ts` · `supabase/admin.ts` · `types.ts`
- `tests/security.mjs`(삭제 대상 `safeFetch.ts`만 시험) + `package.json`의 `"test"` 한 줄을 남는 시험(`tests/runtime.mjs`)으로 바꿈. 의존성·잠금 파일 변경 0.

**남기는 것(운영 동작 그대로)**: 첫 화면·`/guide` 이동 안내(`src/app/page.tsx`·`src/app/guide/page.tsx`·`src/components/MovedNotice.tsx`·`src/app/layout.tsx`·`src/app/globals.css`·`src/lib/version.ts`), 410 API 4개(`/api/crawl`·`/api/proxy`·`/api/proxy-image`·`/api/user/key`), `/api/auth/logout`(+`src/lib/supabase/server.ts`·`cookieDomain.ts`), 0번 규칙 고지 `NOTICE`·`public/ai.txt`·`public/robots.txt`(검색·광고 로봇 허용 정책 그대로), 썸네일, `supabase/` 이력 SQL 13개, `docs/`·`AGENTS.md`·`README.md`, 설정 파일.

**검증(빌드 비용 0, 실행 결과)**: 삭제 뒤 로컬 `tsc --noEmit` 0 · 로컬 `next build` 컴파일 통과 후 Next 16.4.2 보안 권고로 중단(삭제 무관) · `test:runtime`은 서버 키로 실제 magic link를 만드는 시험이라 **실행하지 않음** — 남는 파일이 지운 파일을 부르지 않는지. Vercel 배포는 하지 않음(운영 화면은 지금 배포본 그대로 유지, 다음 website-scraper 배포 때 함께 나감). 문서: `ghost-scraper/AGENTS.md` 맨 위 「정리 완료·백업 위치·태그·복원 방법」, 이 표 T-08 줄.

**되돌리기**: 태그에서 **필요한 파일만** 명시 복구 — 먼저 그 파일 경로를 `docs/ACTIVE_WORK.md`·점유표와 `git status --porcelain -- <파일>`로 확인(남의 미커밋·점유 없을 때만), 태그의 Git blob(바이트 원본)을 **바이트 그대로** 그 파일 하나에만 쓰고(예: Git Bash·cmd에서 `git cat-file blob backup/website-scraper-20261118:ghost-scraper/<파일> > ghost-scraper/<파일>` — PowerShell의 `>`는 인코딩·줄바꿈을 바꾸므로 쓰지 않음) `commit-paths.mjs`로 새 커밋. `git checkout <태그> -- <폴더>`(공용 index·남의 미커밋 덮어씀)·reset·폴더 통째 복원은 하지 않는다. 바이트 원본은 태그의 Git blob(백업 폴더 사본은 69개가 CRLF). 지운 커밋을 되돌리는 새 커밋으로만(이력 다시 쓰기 0).

**하지 않는 것**: 운영 DB·Vercel 프로젝트·도메인 삭제 0, 키·`.env*` 쓰기 0, 다른 프로그램 0, 태그 원격 push는 Master 확인 전 0. 옛 `/login` 404(P3)는 이번 범위 밖 — 후속 후보로만 기록.

### 2-4. T-03 도메인 구조 캐시 회원별 전환 — 계획 (2026-11-18, CC-BLOG-01, Master `msg_c0d8c59bbaec` 읽기 배정 · `msg_2b9c81750d2a` 새 표 전환안으로 보완 · 코드·DB·SQL·Render·빌드 0)

**결정**: 주인님 2026-11-18 채팅 선택창 「회원별로 나누기」(끄기 아님). 근거 규칙: 루트 최상위 규칙 「생성 데이터도 회원 본인 소유로 격리, 비용 절감을 이유로 전역 생성 캐시 예외를 만들지 않는다」, `web-crawler/IMPROVEMENTS.md` #8.

**지금 구조(코드 확인)**
- 표 `web_crawler_domain_profiles`(`webapp/supabase/migrations/0002_captcha_gate_and_domain_cache.sql`): `domain`·`target_fields_key`·`item_selector`·`field_selectors`(jsonb)·`next_page_selector`·`needs_dynamic`·`fetch_method`·`hit_count`·`last_used_at`·`created_at`, `unique (domain, target_fields_key)`, RLS 켬·정책 없음(서버 키 전용). **`user_id` 없음 — 모든 회원이 한 캐시를 같이 씀.** 2026-10-17 기록상 0건(현재 행 수는 미확인 — 운영 DB 읽기 금지 범위).
- 사용처: Render 서비스 `service/pipeline.py` `_crawl()`만 — 135행 `get_cached_plan(url, fields)`(키: 도메인·항목, `escalate`면 안 씀) → 0건이면 167행 `invalidate()` → 수집 성공 뒤 221행 `save_plan()` upsert(`on_conflict=domain,target_fields_key`). 웹앱은 이 표를 읽지 않음. `service/domain_cache.py` 함수 3개 모두 회원 인자 없음.
- 회원 id의 출처: 웹앱 서버 액션 `src/lib/actions/jobs.ts`가 로그인·권한 확인 뒤 `user.id`를 Render `POST /jobs`·`/jobs/{id}/resume` 본문에 실음 → Render `service/main.py`는 `WEB_CRAWLER_SERVICE_SECRET` Bearer만 확인하고 `user_id`를 그대로 믿음(작업 행 주인과 대조 없음). Render는 `SUPABASE_SECRET_KEY`(서버 키)로 접속(`service/supabase_client.py`) — RLS를 우회하므로 **격리는 코드의 `user_id` 필터가 전부**다.
- 30일 정리 `webapp/src/app/api/cron/purge-expired/route.ts`는 `web_crawler_jobs`·결과 파일만 지우고 이 표는 대상 아님.
- 시험: `service/`에는 Python 시험 0(`pytest.ini` testpaths = `scripts`).

**최소 변경안 — 회원별 새 표로 전환(한 안, 2026-11-18 Master `msg_2b9c81750d2a` 보완)**

*옛 안(같은 표에 `user_id` 추가 + 옛 전역 unique 유지)을 버린 이유*: 옛 `unique (domain, target_fields_key)`가 남아 있으면 새 코드의 회원별 저장이 첫째 기존 공용 행(`user_id` 없음), 둘째 같은 도메인·항목을 저장하는 두 번째 회원에서 전역 제약에 걸려 실패한다. 또 옛 Render로 되돌리면 공용 행 조회·갱신·삭제가 다시 살아난다.

1. **DB — 새 표 하나만 추가(옛 표는 손대지 않음)**
   - `web_crawler_member_domain_profiles`: `id`, `user_id uuid not null references auth.users(id) on delete cascade`, 옛 표와 같은 셀렉터 칸들, `hit_count`, `last_used_at`, `created_at`, **`unique (user_id, domain, target_fields_key)`**(전역 unique 없음). RLS 켬·정책 0(서버 키 전용, 웹앱 노출 0). 별도 인덱스는 만들지 않음(같은 열의 UNIQUE가 인덱스를 제공 — 중복 인덱스 0).
   - 옛 공용 표 `web_crawler_domain_profiles`: **새 코드는 읽기·쓰기·삭제 모두 0**. 행을 새 표로 **옮기지 않음**(어느 회원에게도 귀속 0, 다른 회원 재사용 0). 옛 표 삭제는 새 코드가 안정된 뒤 별도 승인(그 전까지는 아무도 안 쓰는 상태로 보존).
   - 파일: `web-crawler/webapp/supabase/migrations/2026111x_member_domain_profiles.sql`(추가만, 옛 표 DDL 0).
2. **Render 코드**
   - `domain_cache.py` 3함수가 새 표만 쓰고 `user_id` 필수(없거나 빈 값이면 캐시 호출 자체를 하지 않음). 조회·삭제 모두 `.eq("user_id", user_id)`, upsert `on_conflict="user_id,domain,target_fields_key"`.
   - **소유자 확인(fail closed)**: `run_job` 맨 앞, 수집·캐시·작업 행 갱신 **전에** `web_crawler_jobs`에서 `job_id` 행의 `user_id`를 읽는다. 행 없음·조회 오류·요청 `user_id`와 불일치면 **그 자리에서 끝냄**(수집 0·캐시 0·작업 행 갱신 0, 서버 로그에 고정 코드만). 처음 시작(`POST /jobs`)과 재개(`/jobs/{id}/resume`) 모두 같은 함수 경로.
   - **캐시 실패는 작업을 막지 않음**: 새 표 조회·저장·삭제가 오류를 내면 캐시 없음으로 보고 정상 수집을 계속(저장 실패도 결과에 영향 0). 소유자 확인 실패와 구분.
   - **되돌리기용 버전을 함께 준비**: 같은 변경 묶음 안에 「캐시를 아예 부르지 않는 버전」(domain_cache 호출을 건너뜀) 커밋을 따로 만들어 둔다. 롤백은 **이 캐시 우회 버전으로만** — 옛 공용 표를 쓰던 이전 커밋으로는 되돌리지 않는다.
3. **배포 전환은 2단계(유입이 옛 인스턴스로 가도 경계가 안 깨지게)**: 「진행 중 0」 한 번 본 뒤에도 Render가 새 버전으로 넘어가는 동안 새 시작·재개 요청은 옛 인스턴스로 들어갈 수 있다. 유입을 서버 정지로 막으면 웹앱(`src/lib/actions/jobs.ts` 26·121행)이 그 작업을 `failed`로 확정하므로 회원 작업이 실패로 남는다 — 그래서 막지 않고, **전환 구간에 남는 옛 인스턴스가 「지금과 같은 버전」이거나 「표를 아예 안 쓰는 버전」만 되도록** 순서를 나눈다.
   - **1단계 — 캐시 우회 버전 배포**(소유자 확인 포함, 어떤 캐시 표도 안 씀). 전환 중 옛 인스턴스로 간 요청은 지금 동작 그대로(회원별 행이 아직 없어 섞일 대상 0). **전환 완료 조건**: Render 배포가 live로 바뀐 시각(T1) 확인 + `created_at < T1`인 `pending`·`running` 작업 0(그전 작업이 옛 인스턴스에서 다 끝남). 조건 전에는 2단계 금지.
   - **2단계 — 회원별 캐시 버전 배포**(새 표 쓰기 시작). 전환 중 옛 인스턴스는 1단계 버전이라 표를 안 씀 → 공용 표 읽기 0·회원 경계 영향 0. **시작 조건**: 아래 4번 30일 정리가 운영에 먼저 나가 있을 것 + 1단계 완료 조건 충족. 완료 조건은 같은 방식(live 시각 T2 이후 이전 작업 0).
   - **중단 조건(어느 단계든)**: 소유자 확인 실패 로그(고정 코드)가 정상 작업에서 나오거나, 작업이 `failed`로 몰리면 그 단계 중단 → 1단계 버전으로 재배포(옛 공용 버전으로는 되돌리지 않음). **재개 조건**: 원인 수정 커밋 + 시험 통과 + Master 재승인.
4. **보관**: 새 표는 회원별 생성 데이터 → `last_used_at` 30일 경과 행 삭제, `profiles.retention_exempt = true` 회원 제외(공용 판정 `resultRetention`과 같은 원칙). 웹앱 purge 경로에 추가, 다음 web-crawler 배포 때(별도 Vercel 빌드 승인). **회원별 쓰기(2단계)는 이 정리가 운영에 나간 뒤에만 시작** — 그 전까지는 1단계(캐시 우회)로 운영.
5. **동시성·오류 캐시**: 같은 회원 같은 키는 upsert 1행, 두 회원 같은 키는 각자 1행. `hit_count` 경합은 숫자만 어긋남. 실패·0건 결과는 저장 0, 0건이면 그 회원 행만 삭제.

**시험(외부 요청 0)** — 새 `web-crawler/service/tests/test_domain_cache.py`·`test_job_owner.py`(가짜 supabase, `pytest web-crawler/service/tests`):
- 두 회원이 **같은 도메인·항목을 각각 저장 → 둘 다 성공**, 서로 조회 시 자기 것만.
- 옛 공용 표에 행이 있어도 새 코드의 저장·조회가 충돌 없이 성공하고, **옛 표 호출 기록 0**.
- 회원 B의 invalidate가 회원 A 행을 지우지 않음 · `user_id` 없으면 캐시 호출 0.
- 캐시 우회(롤백) 버전: 어떤 표도 조회 0 — 공용 행 읽기 0.
- 소유자 확인: 시작·재개 각각 — 작업 행 없음·조회 오류·불일치면 수집 호출 0·캐시 호출 0·작업 행 update 0.
- 캐시 조회·저장이 예외를 내도 작업은 끝까지 처리되고 결과 저장.
- 보관: 30일 경과 행 삭제·`retention_exempt` 회원 행 유지·조회 오류면 삭제 0.

**운영 반영 순서·승인 항목(각각 Master/주인님 승인)**
1. 운영 DB 읽기 1회: 옛 공용 표의 **전체 행 수만**(옛 표에는 `user_id` 칸이 없으므로 「회원 없는 행 수」 = 전체 행 수, 쓰기 0).
2. Render 1단계(캐시 우회 버전) 재배포 — 새 환경변수 0, 비용은 Render 요금제 확인. 완료 조건: live 시각 T1 이후 그전 작업 0.
3. 새 표 마이그레이션 적용(추가만, 옛 표 변경 0).
4. 30일 정리 확장을 다음 web-crawler 묶음 배포로 운영 반영(Vercel 빌드 별도 승인).
5. Render 2단계(회원별 캐시 버전) 재배포 — 시작 조건: 2·3·4 완료. 완료 조건: live 시각 T2 이후 그전 작업 0.
6. 안정 뒤 옛 공용 표 삭제는 별도 승인(이관 0, 필요하면 셀렉터만 저장소 밖 JSON 백업 뒤).
- 되돌리기: Render를 **캐시 우회 버전**으로 재배포(공용 표 사용 재개 0). 새 표는 그대로 두어도 무해.

**1단계 로컬 소스 완료(2026-11-18 BLOG-20261118-06, `a7ef59164`, 미배포·운영 승인 없음)**
- `web-crawler/service/main.py`: `_verify_job_owner()` — 시작(`POST /jobs`)·재개(`/jobs/{id}/resume`) 모두 **예약(`add_task`) 전에** `web_crawler_jobs`의 `user_id`를 1회 읽음. 빈 `user_id` 403(조회 0), 행 없음 404, 조회 예외·응답 모양 이상 503, 불일치·`user_id` 칸 없음 403 — 모두 예약 0·작업 행 변경 0·캐시 0, 로그는 고정 코드만. 주인이 맞으면 기존 202·백그라운드 흐름 그대로. **한계**: 공유 비밀값으로 인증된 웹앱 요청 본문의 `job_id`·`user_id`가 DB 작업 행 소유자와 맞는지(ID 일치)만 확인한다 — 회원 본인 증명이 아니며, 공유 비밀값이 새면 맞는 ID 쌍을 보낸 요청은 통과한다. `/health`가 `commit`(Render 자동 값 `RENDER_GIT_COMMIT` 앞 9자, 새 환경변수 0)과 `domain_cache: "bypass"`를 함께 돌려줌.
- `web-crawler/service/pipeline.py`: `domain_cache` import·조회·삭제·저장 제거 — 매번 회원 본인 키로 셀렉터를 새로 정함. **1단계 동안의 임시 우회**이며 캐시 기능의 영구 중단이 아니다 — 회원별 캐시는 2단계에서 새 표로 다시 켠다(옛 공용 캐시는 재사용 0). `service/domain_cache.py` 파일과 옛 표는 그대로.
- 시험 `web-crawler/service/tests/test_stage1_owner_and_cache.py` 18개 통과(`.venv` python -m pytest service/tests). 고치기 전 코드로 돌리면 2 실패(수집 중 캐시 표 호출·코드에 캐시 참조 — 행동 반례) + 15 오류(소유자 확인 함수가 없어 시험 준비 단계 오류 — 행동 반례 아님, 구분 기록).

**전환 완료 증명(T1 시각·DB 행 수만으로는 부족 — 따로 증명)**
- 첫째, 옛 공용 버전으로 새 요청이 갈 수 없음: 배포 뒤 `/health`를 연속으로 여러 번 불러 모두 새 커밋·`"domain_cache": "bypass"`를 돌려주는지 확인 + Render 배포 기록에서 이전 배포가 종료(live 해제)된 것 확인. `/health`는 **응답한 그 인스턴스만** 증명한다 — 이전 인스턴스 종료와 진행 작업 배출은 아래 둘째의 별도 근거로만 판정.
- 둘째, 옛 인스턴스·진행 중 작업이 모두 빠짐: Render 이벤트에서 이전 인스턴스 종료 시각(T1') 확인 + `created_at < T1'`인 `pending`·`running` 0 + T1' 이후 서비스 로그에 옛 커밋으로 처리된 요청 0.
- 두 조건을 모두 증거로 남기기 전에는 다음 단계(새 표 마이그레이션·2단계) 금지.

**하지 않는 것**: 캐시 끄기(결정과 다름), 옛 공용 행을 새 표로 옮기거나 특정 회원에게 붙이기, 옛 Render 커밋으로 롤백, 웹앱에 표 노출, 실크롤링·AI 호출, T-06 동시 진행. 주인님 결정은 확정이므로 「나누기/끄기」 재질문 0.

## 3. 진행 규칙

- 한 번에 하나씩 끝낸다(플랜 → 구현 → 로컬 검사 → 커밋 → 배포 규칙에 따라 배포 또는 「미배포 대기」 → 화면 검수 → 문서). 작은 수정은 모았다가 배포한다.
- 웹앱(Vercel)과 크롤링 서버(Render)는 따로 배포된다. 둘 다 바뀌는 작업은 플랜에 두 배포를 모두 적는다.
- 작업이 끝나면 이 표의 상태·근거 커밋, [기능 상세 비교표](SCRAPING_FEATURE_MATRIX.md) 해당 칸, `web-crawler/IMPROVEMENTS.md` 해당 번호를 같은 커밋에서 고친다.

## 4. 변경 이력

- 2026-10-24 초안 작성(claude-win-dotori [역할: analysis-planning]). 코드·DB·배포 변경 없음.
