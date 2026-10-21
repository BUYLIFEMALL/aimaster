# ghost-scraper — AI 에이전트 작업 지침

## 1. 프로그램 개요
- **프로그램명**: Website Scraper (웹 데이터 크롤러 & AI 추출기)
- **Slug**: `website-scraper`
- **버전**: `v1.12` (2026-10-16 스마트 매트릭스 디자인 리뉴얼 + 보안 보강)
- **적용 디자인 템플릿**: **스마트 매트릭스 스타일** — [docs/DESIGN_HANDOFF.md](docs/DESIGN_HANDOFF.md) · 플랜 [docs/PLAN_20261016_DESIGN_RENEWAL.md](docs/PLAN_20261016_DESIGN_RENEWAL.md) · 개선 원장 [docs/IMPROVEMENTS.md](docs/IMPROVEMENTS.md) · 인수인계 [docs/IMPROVEMENT_HANDOFF_20261016.md](docs/IMPROVEMENT_HANDOFF_20261016.md)
- **DB 배지(2026-10-16 실측)**: `["new"]`. FREE가 아닙니다. 기존 사이드바 FREE 고정 표시는 후속 개선 #16이며 DB 권한 판정은 그대로 유지합니다.
- **라이브 도메인**: `https://website-scraper.buylife.xyz` (기존 `https://ghost-scraper.buylife.xyz` 유지)
- **Vercel 프로젝트 & 주소**: 프로젝트명 `website-scraper` / 공식 주소 `https://website-scraper.buylife.xyz` / Vercel 기본 `https://website-scraper-ai.vercel.app`, `https://website-scraper-buylife.vercel.app`
- **목적**: 웹사이트 URL을 입력하여 메타데이터, 헤딩 구조, 글목록, 표, 링크, 이미지를 실시간 스크래핑하고, Gemini AI로 비정형 웹 리스트를 구조화된 데이터(순번, 제목, 링크, 썸네일)로 자동 추출하는 지능형 웹 데이터 수집 솔루션.

## 2. 핵심 불변 원칙 준수
1. **사용자 본인 API 키 원칙 (최상위 규칙)**: Google Gemini API 키는 사용자의 브라우저 `localStorage`에 격리 보관되며, 플랫폼 공용 DB `user_api_keys` 테이블과 `/api/user/key`로 동기화된다. 운영자 공용 키 폴백 없음.
2. **AIMaster 통합 이용 권한 게이트**: `src/lib/access.ts`의 `requireProgramAccess()` 적용으로 비로그인 접근 시 메인 SSO(`https://buylife.xyz/login`)로 307 리다이렉트. 실제 DB 배지·등급·이용기간·구독에 따라 공용 권한을 판정합니다(FREE 배지일 때만 가입 회원 무료).
3. **좌측 메뉴 표준 규격 (`docs/SIDEBAR_LAYOUT_STANDARD.md`)**:
   - 상단 프로그램명 + 버전 + FREE 배지
   - `← 다른 프로그램 보기`
   - 대시보드 메인
   - 번호형 작업 흐름 (1: URL 입력 & 탐색 → 2: 데이터 검토 & 분류 → 3: 시각적 섹터 선택 → 4: AI 지능형 분석)
   - 세션 통계 요약 카드 & `데이터 내보내기 (JSON)`
   - `🔑 API키등록·플랫폼연동` · `📖 연동 & 사용 매뉴얼`(`/guide`, v1.12)
   - 계정 이메일 & 로그아웃: **마지막 메뉴 바로 아래**(v1.12부터 맨 아래 고정 아님)
4. **당해 연도(현재 2026년) 원칙**: 모든 AI 프롬프트와 분석 결과에 당해 연도(2026년) 기준을 동적으로 적용 (`new Date().getFullYear()`).

## 3. 핵심 아키텍처 및 기능
- **POST `/api/crawl`**: Cheerio를 활용하여 HTML 파싱, 메타데이터, 시맨틱 헤딩(H1~H3), 하이퍼링크, 이미지, 데이터 표, 글목록 및 AI 분석용 `cleanedHtml` 추출.
- **보안(v1.12)**: 모든 API는 `checkProgramAccessApi()`, 외부 fetch는 `src/lib/safeFetch.ts`(내부·사설 주소 차단, 리디렉트 재검사). 미리보기는 `CSP: sandbox allow-scripts` + iframe `sandbox` — **`allow-same-origin`을 추가하지 말 것**(남의 스크립트가 회원 키를 읽게 됨).
- **GET `/api/proxy`**: 시각적 섹터 선택기용 HTML 프록시. 라이브 웹페이지에 마우스오버 하이라이트 스타일 및 인터셉트 스크립트(`AIS_SECTOR_SELECTED`, `AIS_NAVIGATE_REQUEST`) 주입.
- **GET `/api/proxy-image`**: 이미지 다운로드 CORS 우회 스트리밍 (`JSZip` 일괄 다운로드 지원).
- **GET/POST `/api/user/key`**: Gemini API 키 DB 저장 및 조회.
- **POST `/api/auth/logout`**: 안전한 로그아웃 후 메인 로그인으로 리다이렉트.

## 4. 버전 변경 이력
- `v1.08` (2026-10-12):
   - 주인님 지시로 Vercel 도메인 및 코드베이스 전수 재검사 및 오타 완전 제거.
   - Vercel 오타 도메인(`whbsite-*`) 3건 삭제 완료, 정식 간결 도메인 `https://website-scraper-ai.vercel.app` 및 `https://website-scraper-buylife.vercel.app` 등록 및 alias 연결.
   - `HelpModal.tsx`, `auth.ts`, `types.ts` 내 잔여 `Whbsite` 표기 전수 수정.
   - 코드 및 DB `programs.version = 'v1.08'` 판올림 및 Vercel 프로덕션 재배포 완료.
- `v1.07` (2026-10-12):
   - 주인님 지시로 프로그램명 오타 교정 (`Whbsite Scraper` ➔ `Website Scraper`, slug: `website-scraper`).
   - Vercel 프로젝트명 `website-scraper` 동기화 및 도메인 `https://website-scraper.buylife.xyz`, `https://website-scraper-buylife.vercel.app` 연동 (기존 `whbsite-*`, `ghost-*` 하위 호환 유지).
   - 코드(`lib/version.ts`, `package.json`, `layout.tsx`, `ScraperWorkspace.tsx`, `storage.ts`) 및 DB `programs` name/slug/version 동기화 완료.
   - Vercel 프로덕션 재배포 완료.
- `v1.06` (2026-10-12):
   - 주인님 지시로 Vercel 프로젝트명 `ghost-scraper` → `whbsite-scraper`로 변경 및 `https://whbsite-scraper.vercel.app` 주소 연결 완료.
   - 프로그램 설명글 전면 재정리: '고스트', 'GhostScraper', 중복 키워드 나열 완전 삭제.
   - 카드 표시 최적화: `short_desc`를 직관적인 2줄 문구로 재정리 ("웹사이트 URL 입력으로 본문·표·이미지를 자동 수집하고, AI로 원하는 목록을 구조화하여 추출하는 지능형 웹 스크래퍼").
   - 코드(`lib/version.ts`, `package.json`, `layout.tsx`, `ScraperWorkspace.tsx`, `storage.ts`) 및 DB `programs.version = 'v1.06'` 판올림.
   - Vercel 프로덕션 재배포 완료 (`https://whbsite-scraper.vercel.app`, `https://whbsite-scraper.buylife.xyz`).
- `v1.05` (2026-10-12):
   - 주인님 지시로 프로그램 설명글 리치 콘텐츠화 (`short_desc`, HTML `description` 구조화 갱신).
   - 메인 카탈로그 및 프로그램 상세 페이지 가독성 향상 (5대 핵심 기능 및 본인 API 키 보장 안내).
   - 코드(`lib/version.ts`, `package.json`, `layout.tsx`, `ScraperWorkspace.tsx`) 및 DB `programs.version = 'v1.05'` 판올림.
   - Vercel 프로덕션 재배포 완료 (`https://whbsite-scraper.buylife.xyz`).
- `v1.04` (2026-10-12):
   - 주인님 지시로 프로그램 명칭 `Whbsite Scraper`에 맞춰 슬러그 및 배포 주소를 `https://whbsite-scraper.buylife.xyz`로 동기화.
   - Vercel 도메인 연동 및 DB `programs.slug = 'whbsite-scraper'`, `app_url = 'https://whbsite-scraper.buylife.xyz'`, `version = 'v1.04'` 갱신.
   - Vercel 프로덕션 재배포 완료.
- `v1.03` (2026-10-12):
   - 주인님 지시로 프로그램 공식 명칭을 `Whbsite Scraper`로 변경.
   - `lib/version.ts`의 `APP_NAME = "Whbsite Scraper"` 및 `APP_VERSION = "v1.03"` 갱신.
   - DB `programs`의 `name = "Whbsite Scraper"`, `version = "v1.03"` 동기화 완료.
   - Vercel 프로덕션 재배포 완료 (`https://ghost-scraper.buylife.xyz`).
- `v1.02` (2026-10-12):
   - 주인님 지시로 프로그램 공식 명칭에서 'PRO' 제거 (`GhostScraper PRO` → `GhostScraper`).
   - `lib/version.ts`의 `APP_NAME = "GhostScraper"` 및 `APP_VERSION = "v1.02"` 갱신.
   - DB `programs`의 `name = "GhostScraper"`, `version = "v1.02"` 동기화 완료.
   - Vercel 프로덕션 재배포 완료 (`https://ghost-scraper.buylife.xyz`).
- `v1.01` (2026-10-12):
  - 신규 서브프로젝트 스캐폴딩 (Next.js 16, React 19, Tailwind CSS v4, Cheerio, JSZip, Lucide React).
  - 1~4 스텝퍼 워크플로우 및 7대 탭 뷰어(개요, AI 분석, 구조, 글목록, 표, 링크, 이미지) 구축.
  - 시각적 섹터 선택기 모달(실시간 iframe 프리뷰 + DOM 인스펙터) 탑재.
  - Gemini 2.5 Flash 기반 AI 스마트 리스트 추출 엔진 탑재.
  - CSV 다운로드 및 이미지 일괄 ZIP 다운로드 엔진 구현.
  - Vercel 프로덕션 배포 완료 (`https://ghost-scraper.buylife.xyz`).
  - DB `programs` 등록 및 카탈로그 전용 16:9 실사 썸네일 생성·연동 완료.
- v1.09 (2026-10-12): 핸드폰 번호 필수 정책 적용 — 핸드폰 번호가 없는 회원(관리자 제외)은 이용할 수 없고 메인 사이트 설정에서 번호를 등록하도록 안내합니다. 공용 규칙은 루트 `lib/utils/phone.ts`, 상세는 `docs/HANDOFF.md` 2026-10-12 항목.


## B5 (2026-10-15) — 한국 시간 현재 월 기준 추가 (v1.10)

- 주 생성·분석 지침에 한국 시간 기준 현재 연·월을 반영하고, 계절·시기 표현은 현재 월에 맞추며 불필요한 계절·연도 표현을 덧붙이지 않도록 했습니다.


## 2026-10-16 DB 연동 변수 호환 — v1.11 (website-scraper)

작업 전 [최상위 데이터베이스 연동 지침](../docs/DATABASE_CONNECTION_POLICY.md)과 [전체 전환 인수인계](../docs/DATABASE_CONNECTION_HANDOFF.md)를 먼저 읽습니다. 공개 키는 새 PUBLISHABLE 이름 우선·기존 ANON 이름 호환, 서버 키는 새 SECRET 이름 우선·기존 SERVICE_ROLE 이름 호환입니다. 새 값 없음/공백일 때만 같은 종류의 기존 값을 사용하며, 인증 실패 후 다른 키로 재시도하지 않습니다. 기존 변수·실제 키·회원 권한·Cron은 유지합니다. 배포·회원 검수 결과는 전체 인수인계의 프로그램별 기록에서 확인합니다. 기존 변수 삭제와 실제 키 폐기는 별개이며 안정화 확인 전 삭제하지 않습니다.


## 2026-10-16 스마트 매트릭스 디자인 리뉴얼 + 보안 보강 — v1.12 (Claude Code 맥미니)

- 🚨 보안: `/api/crawl`·`/api/proxy`·`/api/proxy-image`에 권한 확인이 없던 것(누구나 대리 접속 통로로 사용 가능) 수정, `/api/user/key`도 프로그램 권한 확인으로. 내부·사설 주소 차단(`safeFetch`). 미리보기가 남의 사이트 스크립트를 우리 도메인 권한으로 실행하던 것을 sandbox로 격리 + 메시지 출처 확인.
- 디자인: 스마트 매트릭스(다크 차콜 + 블루·앰버, Tailwind v4 `@theme`), 히어로·KPI 4종, 다크 7탭·표, 글목록/링크/AI 결과 검색, 사이드바 계정 밀착 + 📖 매뉴얼, `/guide` 신설(`HelpModal` 제거), 섹터 모달 모바일 세로 배치.
- 작은 수정: 내보내기 버전 `APP_VERSION`, ZIP 이름 `website_scraper_images_*`, ZIP 결과 화면 안내(`alert` 제거).
- **맥미니 작성 당시 대기 기록이며 현재 Windows 운영 완료** — [docs/IMPROVEMENT_HANDOFF_20261016.md](docs/IMPROVEMENT_HANDOFF_20261016.md) 「다음 첫 단계」.


## Windows 인수 보안 검수 (2026-10-16, v1.12)

[README.md](README.md), [검수 플랜](docs/VERIFICATION_PLAN_20261016.md), [동일 날짜 인수인계](docs/IMPROVEMENT_HANDOFF_20261016.md)의 Windows 절을 먼저 읽습니다. `safeFetch`는 검사한 DNS를 undici 연결에 고정합니다. CSP·iframe sandbox에 allow-same-origin을 추가하지 않습니다. `npm test`는 외부 연결 없는 보안 검사, `npm run test:runtime`은 실제 시험 회원과 보이는 Edge를 쓰며 유료 AI를 호출하지 않습니다. 운영 결과는 디자인 인수인계 7절에 기록합니다.


## 2026-10-16 Windows 완료 — v1.12

소스 `bd9a2388`, production `dpl_HjwYj14feCUNkyUUgszi7NVpTwga` READY, DB v1.12. 보안 26개·실제 일반 회원 Edge 로컬/운영 각 15개 묶음 통과, 1440px/375px 확인. 상세·증거·검사 한계·다음 첫 단계는 [디자인 인수인계 7절](docs/DESIGN_HANDOFF.md)과 [개선 인수인계 최종 운영 완료 절](docs/IMPROVEMENT_HANDOFF_20261016.md)을 기준으로 합니다. 유료 AI 0회. #7/#15/#16 및 기존 #8~13 제안은 미구현입니다.

<!-- DETAILED_PROGRAM_REVIEW_20261019 -->
## 2026-10-19 Codex — 프로그램별 상세 개선 분석(구현 아님)

[세부 개선안·필요 이유·근거·시험 조건](docs/DETAILED_REVIEW_20261019.md) · [전체 83개 분석](../docs/program-reviews-20261019/INDEX.md) · [공통 아이디어 표](../docs/PROGRAM_IDEA_BACKLOG.md). 이 프로그램 4개 검토 항목입니다. 코드·DB·환경변수·배포는 바꾸지 않았습니다. 작업 전 최신 개선 원장·ACTIVE_WORK와 대조하고 이미 해결된 기능은 보존합니다. 후속 작업 후 처리 ID·증거·미완료·새 인사이트·프로그램 링크를 기록합니다.
<!-- /DETAILED_PROGRAM_REVIEW_20261019 -->

## 2026-10-21 v1.13 — 병합 A: 웹 크롤링 자동화 「🔎 한 페이지 분석」으로 합쳐짐 (Claude Code 윈도우, 부계정)
- 기능(7탭·영역 선택·AI 목록 표·CSV·ZIP)은 `web-crawler/webapp` `/inspect`로 옮김(AI는 서버에서 회원 본인 키, 4개 공급자). 이 앱은 주소 유지 + 안내 화면(`src/components/MovedNotice.tsx`, 첫 화면·/guide), API 4개(`/api/crawl`·`/api/proxy`·`/api/proxy-image`·`/api/user/key`) 410 — 특히 회원 키 원문을 내주던 `/api/user/key` 차단.
- 운영 DB: `programs` website-scraper v1.13·`is_active=false`, 권한 회원은 모두 웹 크롤링 권한 보유(6명 기간 연장). 남은 코드(`ScraperWorkspace` 등)는 사용 안 함 — 정리는 백업 폴더 `D:\Antigravity\AIMaster_backupetired-programs\` + git 태그 뒤.

