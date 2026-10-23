# AGENTS.md — web-crawler (Codex / Claude Code dual-host)

이 레포는 URL과 수집 항목을 받아 사이트를 정찰·대량수집하고 엑셀로 내보내는 범용 웹 크롤링 에이전트다. **`CLAUDE.md`와 `.codex/skills/web-crawler/SKILL.md`가 *어떻게*에 대한 SSOT다.** 이 파일은 Codex용 **실행 계약**이다 — Claude Code는 Skill 런타임으로 같은 규율을 자동 적용받지만, Codex는 Skill 런타임이 없으므로 이 파일이 대신 강제한다.

## 최초 환경 셋업 (클론 직후 1회)

수집 전에 환경을 준비한다. **한 명령**으로 단계별 설치+검증을 하고, 이미 된 단계는 skip한다:

```powershell
# Windows (PowerShell) — 실행 정책 우회가 표준
powershell -ExecutionPolicy Bypass -File scripts\setup.ps1
```
```bash
# macOS / Linux
python -m venv .venv && . .venv/bin/activate && python scripts/bootstrap.py
```

단계: ① Python deps → ② 브라우저(Chromium) → ③ agent-browser(표준 정찰 도구) → ④ preflight 검증.
실패하면 "다음에 실행할 정확한 명령"이 출력된다. 모드: 기본 full(표준) / `--core-only`(agent-browser 제외) / `--skip-browser` / `-VerbosePip`(pip 상세 로그).

**`py` 런처 깨짐 자동 처리**: `setup.ps1`은 `py -3`/`python`/`python3`를 실제 실행해 3.10+를 확인하고 성공하는 쪽으로 venv를 만든다. `py -3`가 `No installed Python found!`로 실패하면 자동으로 `python`으로 fallback한다. 그래도 venv가 안 생기면 직접: `python -m venv .venv` → `.\.venv\Scripts\python.exe scripts\bootstrap.py`.

**수동/디버깅 시 실제 동작하는 명령 (Windows)**:
```powershell
python --version ; py -3 --version       # 어느 쪽이 동작하는지 먼저 확인 (py 깨졌으면 python 사용)
python -m venv .venv ; .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt --progress-bar off    # 멈춘 듯하면 끝에 -v 추가
scrapling install                        # Chromium 1회 설치 (내부에서 playwright install chromium 수행 — 따로 또 X)
npm.cmd install -g agent-browser ; agent-browser.cmd install   # PowerShell은 .cmd 사용
python scripts\preflight.py              # 검증: core / agent-browser 분리 PASS·WARN·FAIL
```
- `python -m scrapling`은 동작 안 함 → `scrapling install`(venv 활성화) 또는 `.\.venv\Scripts\scrapling.exe install`.
- pip이 진행 없이 멈춘 듯하면 정상(대용량 휠 다운로드). 진행 확인: `.\.venv\Scripts\python.exe -m pip install -r requirements.txt --progress-bar off -v`.
- 검증은 `scripts/preflight.py`가 담당: **core(Python/Scrapling/Playwright)**와 **agent-browser**를 분리 보고. core 통과·agent-browser 실패면 "전체 설치 미완료"(종료코드 1). 전체 가이드는 `README.md` "처음 설치하기".

## 스킬 소스 (생성 미러)

- **`.claude/skills/`가 정본. `.codex/skills/`는 생성 미러**다 — 텍스트 안의 `.claude/skills` 경로만 `.codex/skills`로 치환된 것 외엔 byte-identical.
- **`.codex/skills/`를 직접 수정하지 말 것.** `.claude/skills/`를 고친 뒤 `python scripts/sync_codex_mirror.py`를 실행해 미러를 재생성한다. (어긋남 확인: `python scripts/sync_codex_mirror.py --check`)
- **문서의 "알려진 도메인" 목록도 생성물**이다 — `fingerprints/*/profile.json`이 SSOT. 새 프로필을 추가했으면 `python scripts/sync_domain_list.py`로 CLAUDE.md/README.md를 재생성한다. (어긋남 확인: `python scripts/sync_domain_list.py --check` / 테스트: `scripts/test_sync_domain_list.py`)

## 크롤링 요청을 받으면 — 필수 절차

사용자가 "크롤링/스크래핑/수집/~를 모아줘/입찰공고 수집" 등을 요청하면:

1. **즉흥 처리 금지.** `.codex/skills/web-crawler/SKILL.md`를 단계대로 실행한다. 절차를 요약하고 임의로 구현하지 않는다. **폴백 재구현 금지** — `requests`/`urllib`/`httpx`/`BeautifulSoup`로 직접 수집하거나 인라인으로 긁지 않는다. 수집은 항상 생성한 `crawl_script.py` 안의 **Scrapling 또는 Playwright**로만 한다.

2. **절대 규칙 0 — 도메인 히스토리 우선.** 정찰하기 전에 반드시 `fingerprints/<sanitized_domain>/profile.json`과 `output/<도메인>/`을 먼저 본다. 프로필이 있으면 `notes`/`fetcher_type`/`antibot_strategy`를 그대로 채택하고 정찰을 건너뛰어 Step 3으로 점프한다. profile.json이 있는데 무시하고 정찰부터 다시 하는 것은 금지(5~20분 비싼 작업 반복). 알려진 도메인 목록은 `CLAUDE.md` 의 생성 블록 참조.

3. **프로필 게이트.** Step 1-A(프로필 있으면 load) ↔ Step 5-A(수집 성공 직후 save/갱신, `notes` 필드 필수). Step 5-A를 빠뜨리면 수집 결과가 살아있어도 **"파이프라인 미완료"**로 보고한다.

## 정찰 도구 — agent-browser가 표준 (양 host 공통)

- 정찰(Step 2)의 **표준·기본 도구는 `agent-browser`**다. 선택 기능이 아니다 — 워크플로상 정찰 단계에서는 **단순 정적 사이트를 긁더라도 agent-browser를 먼저 사용**한다. vercel-labs의 독립 CLI(`npm install -g agent-browser`)라 **Claude Code·Codex 모두 동일하게** 쓴다(Claude 전용 아님). 양 host 모두 정찰 시작 전 우선 `agent-browser skills get core --full`로 사용법을 로드한다. 설치된 구버전이 `Unknown command: skills`를 반환하면 `agent-browser --help`의 snapshot/network 명령을 로드한다. 이 오류만으로 agent-browser 자체가 불능이라고 판정하거나 폴백으로 내려가지 않는다.
- **정찰 폴백 티어 (agent-browser를 못 쓸 때만).** 위에서부터 내려간다. 어느 티어를 썼는지 profile.json `notes`에 남긴다.
  - **폴백 1 (Claude): Claude in Chrome** (`mcp__claude-in-chrome__*`) — **Claude 계열 host 전용**(Claude Code / Cowork). 사용자의 실제 Chrome을 조종해서 **실제 쿠키·실제 IP**가 그대로 붙는 게 최대 장점. Step 2 정찰 항목 5개는 전부 대체된다(검증 완료). 단 네트워크 감시에 제약이 있으니 반드시 SKILL.md Step 2 "Claude in Chrome 폴백" 절차를 따를 것.
  - **폴백 1 (Codex): ChatGPT Chrome 플러그인 Browser Use** (`chrome:control-chrome`) — **Codex 세션에 Chrome 스킬이 있고 사용자의 ChatGPT Chrome 확장이 연결될 때만** 쓴다. 사용자의 실제 Chrome을 조종하므로 실제 브라우저 상태·세션·IP를 활용할 수 있다(쿠키·스토리지를 직접 읽지는 않는다). Step 2 정찰 항목 5개는 대체한다(2026-08-19 `books.toscrape.com` 실측). 단 일반 XHR/fetch 요청과 응답 헤더·본문을 직접 캡처하는 API는 없으므로, API 네트워크 감시가 필요하면 폴백 2의 Playwright `sync_api`를 네트워크 보조 수단으로 쓴다. 반드시 SKILL.md Step 2 "ChatGPT Chrome Browser Use 폴백" 절차를 따를 것. Chrome 확장이 연결되지 않으면 이 티어를 건너뛴다.
  - **폴백 2 (공통): Scrapling `DynamicFetcher`** 또는 **Playwright `sync_api`**(`page.on("response")`로 XHR/API 캡처) — 양 host 공통, Python 의존성에 포함돼 항상 가능. (SKILL.md 규칙 1 예외와 동일.)
  - **host별 경로를 섞지 않는다.** Claude Code/Cowork는 `agent-browser → Claude in Chrome → 폴백 2`, Codex는 `agent-browser → ChatGPT Chrome Browser Use(연결 시) → 폴백 2`다. Codex에서 Claude in Chrome을 찾지 않는다.
  어느 경우든 가능하면 `agent-browser.cmd install`로 표준 경로 복구를 먼저 시도한다.
- **수집은 폴백 대상이 아니다.** Claude in Chrome과 ChatGPT Chrome Browser Use는 **정찰 전용**이다 — 브라우저에서 전량 추출하는 것은 절대 규칙 2 위반. 수집은 어떤 host에서든 `crawl_script.py`(Scrapling/Playwright)로 한다.
- **원격 전용 환경(Cowork 등)에서 전 파이프라인 실행은 불가.** Cowork 샌드박스는 egress가 기본 "package managers only"(npm/PyPI/GitHub)라 대상 사이트 직접 접속이 막히고, 뚫어도 데이터센터 IP라 브라우저 세션이 필요한 도메인의 profile 레시피가 재현되지 않으며, VM에서 호스트 Chrome의 CDP 포트에 붙을 수 없어 `scripts/chrome_cdp.py` 경로가 통째로 죽는다. 원격에서는 **정찰만** 하고 profile.json을 갱신한 뒤, 수집은 로컬에서 실행한다.
- **수집·프로필·엑셀·CDP는 양 host 완전 동일**: 수집(Scrapling), 도메인 프로필(`scripts/domain_profile.py`), 엑셀(`scripts/export_excel.py`), 브라우저 세션이 필요한 사이트 대응(`scripts/chrome_cdp.py`), 진행 체크포인트(`scripts/progress.py`).

## 안전 — 하드룰 (위반 금지)

- **자동 접근 차단을 만나면 통지 후 사용자 선택** — CAPTCHA·WAF·봇 탐지는 법적으로 같은 보호조치다. 어느 쪽이든 **자동으로 넘어가지 않고 이음매를 통과할 때마다 한 번 알리고 사용자가 고른다**. '진행' 이면 그대로 간다 — 근거를 묻지도 검증하지도 않는다. 통지를 면제하는 것은 도메인이 아니라 그 프로필이 **지금 들고 있는** `consent` 기록이다(sticky) — 사다리 A 로 내려가 프로필이 배포 대상이 되면 그 기록은 지워지므로(사용자의 통지 이력을 배포되는 파일에 실어 보내지 않는다), 사이트가 나중에 새로 막으면 다시 통지한다. 상세는 `.codex/skills/web-crawler/SKILL.md` Step 3 "이음매 통지 게이트".
- **CAPTCHA 자동 풀이 금지** — 위 통지 게이트와 별개다. reCAPTCHA/hCaptcha 를 **프로그램으로 푸는 것**은 하지 않는다. 사용자가 agent-browser 로 직접 풀고 이어가는 것은 가능하다.
- **로그인 자격증명 저장 금지** — ID/PW를 코드·메모리·파일에 저장하지 않는다. 사용자가 직접 로그인 → 쿠키만 추출(`output/<도메인>/cookies.json`, `.gitignore`가 차단).
- **robots.txt 제한** 발견 시(`Disallow: /` 또는 대상 경로 차단) 진행 여부를 사용자에게 묻는다.
- **PII 감지 필수** — 수집 데이터에 전화번호/주민번호/이메일 등이 섞이면 `detect_pii(data)`로 경고하고 보고한다.
- **법적 위험이 큰 요청은 구체적으로 경고** — 저작권 침해 목적의 본문 복제(분량 축)·개인정보 대량 수집(성격 축)·명시적으로 금지된 재배포(목적 축). **어느 축이 왜 걸리는지 짚어서 알린 뒤 진행 여부는 사용자가 정한다** — 근거를 묻지도 검증하지도 않는다. **약관이 크롤링을 금지한다는 사실만으로는 여기 해당하지 않는다** — 그건 접근의 계약 층이고, 위 통지 게이트로 간다.
- **수집 0건이면 즉시 중단·보고** — 계속 시도하면 ban 위험.

> **위 '경고' 규칙과 통지 게이트는 같은 층위다.** 경고는 요청이 **어떤 위험 축에 걸리는지**를,
> 게이트는 **기술적 차단을 만났다는 사실**을 알린다. 알리는 대상만 다를 뿐 둘 다 알리는 데서
> 끝나고 고르는 쪽은 사용자다 — 어느 쪽도 요청 자체를 막지 않으며, 근거를 묻지도 검증하지도
> 않는다.
>
> 이 문서가 정의하는 것은 **도구의 동작**이다. 실행하는 AI 에이전트 자신의 판단 기준은 별개로
> 작동하며 이 문서가 그것을 대신 약속하지 않는다 — `ACCEPTABLE_USE.md` 참조.

## 빠른 참조

| 무엇 | 경로 |
|------|------|
| 워크플로우 7단계 | `.codex/skills/web-crawler/SKILL.md` |
| Fetcher 코드 템플릿 | `.codex/skills/web-crawler/references/fetcher-patterns.md` |
| 안티봇(Akamai/Cloudflare/SPA 세션) | `.codex/skills/web-crawler/references/antibot-strategies.md` |
| 수집 실패 진단 | `.codex/skills/web-crawler/references/troubleshooting.md` |
| 프로젝트 규칙·도구 분리 SSOT | `CLAUDE.md` |


## 2026-10-16 DB 연동 변수 호환 — v1.05 (web-crawler-saas)

작업 전 [최상위 데이터베이스 연동 지침](../docs/DATABASE_CONNECTION_POLICY.md)과 [전체 전환 인수인계](../docs/DATABASE_CONNECTION_HANDOFF.md)를 먼저 읽습니다. 공개 키는 새 PUBLISHABLE 이름 우선·기존 ANON 이름 호환, 서버 키는 새 SECRET 이름 우선·기존 SERVICE_ROLE 이름 호환입니다. 새 값 없음/공백일 때만 같은 종류의 기존 값을 사용하며, 인증 실패 후 다른 키로 재시도하지 않습니다. 기존 변수·실제 키·회원 권한·Cron은 유지합니다. 배포·회원 검수 결과는 전체 인수인계의 프로그램별 기록에서 확인합니다. 기존 변수 삭제와 실제 키 폐기는 별개이며 안정화 확인 전 삭제하지 않습니다.

## 2026-10-16 도메인 통일(SSO) — v1.06 (Claude Code 윈도우)
- 새 주소 `https://web-crawler-saas.buylife.xyz`, `programs.app_url` 갱신(마이그레이션 `supabase/migrations/20261016_sso_domain*.sql`). 로그인 쿠키 `.buylife.xyz` 공유(`cookieDomain.ts` + 브라우저·서버 클라이언트·미들웨어, 기준 `stepmail`). 옛 `*.vercel.app` 화면 → 새 주소 308(API 제외, 옛 주소 유지). 자기 주소 기본값(환경변수 없을 때)만 새 주소로, Vercel 환경변수는 변경 안 함.
- 검수: 새 주소 / → /dashboard 재로그인 없이 열림(시험 계정 표시), 옛 주소 308. 코드 위치 web-crawler/webapp
- 플랜: `docs/DOMAIN_SSO_MIGRATION_PLAN_20261016.md`

## 2026-10-17 v1.07 — 디자인 리뉴얼: 스마트 매트릭스(다크) (Claude Code 맥미니)
- `ghost-scraper` 토큰·부품 이식, 사이드바 스텝퍼 + 📖 매뉴얼 + **휴대폰 ☰**, 대시보드(상태 KPI·수집 중 강조·최근 작업 표), `/guide` 신설, 로그인 다크. 서버 로직 변경 없음.
- **빌드·배포·화면 검수는 윈도우 CLI 대기.** 30일 자동 삭제 미적용 발견(IMPROVEMENTS #5).
- 문서(이 폴더는 `docs/`가 gitignore라 최상위): [PLAN_20261017_DESIGN_RENEWAL.md](PLAN_20261017_DESIGN_RENEWAL.md) · [DESIGN_HANDOFF.md](DESIGN_HANDOFF.md) · [IMPROVEMENTS.md](IMPROVEMENTS.md) · [IMPROVEMENT_HANDOFF_20261017.md](IMPROVEMENT_HANDOFF_20261017.md)

## 2026-10-17 v1.08 — 생성 데이터 30일 자동 삭제 (Claude Code 맥미니, 주인님 승인)
- `webapp/src/app/api/cron/purge-expired/route.ts`: `CRON_SECRET` 확인 → 30일 지난 `web_crawler_jobs`를 500개씩 찾아 Storage `web-crawler-results/${user_id}/${job_id}.xlsx`를 지운 뒤 기록 삭제(파일 삭제 실패 시 기록 유지·다음 날 재시도). `webapp/vercel.json` 매일 18:17 UTC(03:17 KST).
- Storage는 SQL 직접 삭제가 보호돼 있어 pg_cron 대신 Vercel Cron + Storage API를 씀.
- 매뉴얼 FAQ에 30일 삭제 안내 추가. **빌드·배포·`CRON_SECRET` 설정·첫 실행 확인은 윈도우 CLI 대기**: [IMPROVEMENT_HANDOFF_20261017.md](IMPROVEMENT_HANDOFF_20261017.md) 「v1.08」.
- 새로 발견(주인님 결정 필요): 도메인 구조 공유 캐시(IMPROVEMENTS #8), 결과 버킷 공개(#9).


## 2026-10-19 플랫폼 분석 — 추가 검토·개발 제안 (미구현)

F-017(P2)를 운영 설정/코드/조건부 위험과 구분해 기록했습니다. **수정·DB적용·배포는 미실행**입니다. [프로그램별 발견·다음 첫 단계](docs/IMPROVEMENT_HANDOFF_20261019_ANALYSIS.md) · [전체 분석/병합 제안](../docs/analysis-20261019/REPORT.md). 주인님 지정 작업과 최신 구현을 대조한 뒤 플랜부터 제시합니다.

## 2026-10-21 v1.09 — 병합 A: Website Scraper → 「🔎 한 페이지 분석」 + v1.08(30일 삭제) 첫 배포 (Claude Code 윈도우, 부계정)
- 분석·결정: 루트 `docs/analysis-scraping-consolidation-20261021/REPORT.md`(묶음 A), 플랜 [`PLAN_20261021_MERGE_A_WEBSITE_SCRAPER.md`](PLAN_20261021_MERGE_A_WEBSITE_SCRAPER.md)(주인님 승인).
- 웹앱 새 메뉴 3단계 `/inspect`: `POST /api/inspect`(서버 안전 수집 `src/lib/inspect/safeFetch.ts` — 사설망·DNS 재바인딩 차단 + cheerio로 메타·H1~H3·글목록·표·링크·이미지·정리 HTML), `GET /api/inspect/proxy`(격리 미리보기 `CSP: sandbox allow-scripts` + 영역 선택 스크립트, 받는 쪽은 iframe에서 온 메시지만), `GET /api/inspect/image`(이미지만, ZIP용), `POST /api/inspect/ai`(같은 출처·권한·**회원 본인 키를 서버에서만** — OpenAI·Claude·Gemini·Perplexity, 모델 목록은 `src/lib/ai/models.ts`, 요청 형식은 `service/llm.py`와 같음, 사용 기록 `inspect_ai`). 화면 `src/components/inspect/*`(옛 앱 화면을 경로만 바꿔 이식 + `InspectWorkspace`), 매뉴얼 FAQ 1개.
- 옛 단점 제거: 회원 Gemini 키 원문을 브라우저로 보내던 `/api/user/key`·브라우저 저장·브라우저 직접 AI 호출·구형 모델·Gemini 하나.
- 함께 첫 배포: v1.08 30일 자동 삭제(`/api/cron/purge-expired`, 이 배포 때 `CRON_SECRET` 새 등록 — 주인님 승인) + 메뉴 아이콘. 패키지 추가: cheerio·jszip·undici·lucide-react.
- 운영 DB(ref `esgxyikcnnvmlhygjkth`): website-scraper 권한 회원 178명은 모두 이미 이 프로그램 권한이 있어 **기간만 6명 연장**(백업은 저장소 밖 `D:\Antigravity\AIMaster_backup\merge-a-20261021\`), 상세 소개 🔎 단락·특징 2번 갱신, 버전 v1.09. SQL 기록 `supabase/migrations/20261021_merge_a_v1_09.sql`.
- 검수: tsc·build, 운영 Ready, 크롬 관리자 — books.toscrape.com 목록 분석(탭 7개·글목록 49·링크 73·이미지 20) → AI 목록 표(GPT-5.6 Luna 1회, 20권·썸네일, 20초) → 영역 선택(책 이미지 태그·HTML 잡힘) → 이미지 경로 200. 보안: 정리 경로 비밀값 없이 401, AI 경로 다른 출처 403, 분석 경로 비로그인 401. CSV·ZIP 실제 내려받기는 파일 저장이라 생략(같은 코드 이식).
- 남은 일(별도): 도메인 구조 캐시 회원별(IMPROVEMENTS #8 — Python 서비스·DB 구조), 옛 ghost-scraper 코드 정리는 백업 폴더+태그 뒤.

## 2026-10-23 v1.10 — 결과 엑셀 비공개 버킷 + 10분 임시 주소 (#9, Claude Code 윈도우)
- 주인님 승인(「비공개 버킷 — 은행 금고」 방식). 결과 버킷 `web-crawler-results`를 **비공개**로 바꾸고, 「엑셀 다운로드」(작업 목록·대시보드)는 새 `webapp/src/app/api/jobs/[id]/download/route.ts`가 로그인·이용 권한·본인 작업·완료·30일 이내를 확인한 뒤 **10분짜리 임시 주소**로 넘긴다. 크롤링 서버(Render `service/pipeline.py`)는 그대로 — `_upload_result`의 공개 주소(`result_url`)는 「파일 있음」 표시로만 쓰이고 링크에는 안 쓰인다.
- 운영(ref esgxyikcnnvmlhygjkth, 크롬 SQL Editor): `storage.buckets.public=false`·DB v1.10(`webapp/supabase/migrations/20261023170000_*`). 운영 완료 작업 0건이라 밖으로 나간 결과 파일은 없었다.
- 검수: tsc·build·배포 `web-crawler-saas-9a3jiweql` Ready. 비로그인 다운로드 401, 로그인(관리자) 남의/없는 작업 404, 시험 파일로 전환 전 공개 200 → 전환 후 새 파일 공개 **400**·임시 주소 200(처음 파일은 잠시 CDN 캐시 200 뒤 400), 시험 파일 2개 삭제. 실제 크롤링 결과 내려받기는 완료 작업이 없어 미확인(첫 실사용 때 확인).
- 참고: `IMPROVEMENTS.md`에 Windows 숨김 속성이 붙어 있어 Node `writeFileSync`가 EPERM — `r+`로 열어 고쳐 씀(속성은 그대로 둠).
- 남은 일: #8 도메인 구조 캐시 회원별 전환(크롤링 서버 수정·Render 재배포 필요).
- 링크: https://web-crawler-saas.buylife.xyz/dashboard
