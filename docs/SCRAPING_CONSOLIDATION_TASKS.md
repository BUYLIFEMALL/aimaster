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
| T-03 | 도메인 구조 캐시 회원별 전환 또는 끄기 | **결정 대기** | `IMPROVEMENTS.md` #8, 비교표 R4 | 표 구조 변경 + 크롤링 서버(Render) 재배포 | 주인님께 「회원별로 나누기 / 끄기」 중 선택 여쭘 |
| T-04 | 웹앱 Next.js 16.2.11 → 16.4.2 보안 업데이트 | 대기 | `docs/HANDOFF_20261023_NEXTJS_SECURITY_SPLIT.md` 묶음 E(미커밋 `web-crawler/AGENTS.md` 때문에 제외됨 — 그 변경은 빈 줄 1개 삭제뿐) | Vercel 빌드 1회(사전 승인) | 미커밋 변경 주인 확인 → `npm install next@16.4.2` → tsc·build → 배포 |
| T-05 | 한 페이지 분석에 robots.txt 확인 | 구현 준비 2차(2026-11-17 BLOG-20261117-08, 리디렉트 빈틈 보완, 구현 담당 배정 대기) | 완성 기준 §2 조건 4, 비교표 R1, 아래 §2-1 | 웹앱 배포(모아서 배포 가능) · `robots-parser` 1개 설치(라이선스 확인 뒤) | 그 밖의 4xx 처리 확인 → Master 구현·검수 분리 배정 |
| T-06 | `Crawl-delay` 반영 + 다음 페이지 robots 확인 | 대기 | 비교표 R2·R3 | 크롤링 서버 재배포 | `pipeline.py` `RateLimiter` 지연값 계산 플랜 |
| T-07 | 대시보드 자동 새로고침·완료 엑셀 미리보기 | 대기 | `IMPROVEMENTS.md` #6·#7, 비교표 R6·R7 | 웹앱 배포 | 작업 목록의 5초 새로고침을 대시보드에 재사용 |
| T-08 | 옛 `ghost-scraper/` 코드 정리 | 대기 | `ghost-scraper/AGENTS.md` v1.13 「정리는 백업 폴더 + git 태그 뒤」 · 2026-10-24 `D:\Antigravity\AIMaster_backup\retired-programs\`에 없음 · 관련 git 태그 없음 | 주소 유지 필요(옛 주소 안내), 삭제는 사전 승인 | 백업 폴더 복사 + 태그 → 안내 화면·410만 남기고 정리 플랜 |
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

**Master 결정(2026-11-17 msg_0101dd1848c2)**: 범위 `/api/inspect`만 · 404는 진행, 401·403은 거절, 5xx·시간 초과는 본문 요청 안 하고 다시 시도 안내(자동 재시도 없음) · 파서는 MIT `robots-parser` 우선(설치 전 라이선스·의존성 확인, 설치는 아직 안 함).
**남은 확인 1개**: 그 밖의 4xx(410·429 등) 처리 — 위 표의 제안.

- 0번 규칙 고지: `node scripts/apply-source-notice.mjs --check web-crawler` → 고칠 곳 0개(읽기만).
- 범위 밖: T-03 캐시 정책, T-04 Next 업그레이드, T-06 `Crawl-delay`, T-08 삭제. 이 폴더의 남의 미커밋 `web-crawler/AGENTS.md`는 그대로 둠.

## 3. 진행 규칙

- 한 번에 하나씩 끝낸다(플랜 → 구현 → 로컬 검사 → 커밋 → 배포 규칙에 따라 배포 또는 「미배포 대기」 → 화면 검수 → 문서). 작은 수정은 모았다가 배포한다.
- 웹앱(Vercel)과 크롤링 서버(Render)는 따로 배포된다. 둘 다 바뀌는 작업은 플랜에 두 배포를 모두 적는다.
- 작업이 끝나면 이 표의 상태·근거 커밋, [기능 상세 비교표](SCRAPING_FEATURE_MATRIX.md) 해당 칸, `web-crawler/IMPROVEMENTS.md` 해당 번호를 같은 커밋에서 고친다.

## 4. 변경 이력

- 2026-10-24 초안 작성(claude-win-dotori [역할: analysis-planning]). 코드·DB·배포 변경 없음.
