# ghost-scraper — AI 에이전트 작업 지침

## 1. 프로그램 개요
- **프로그램명**: Whbsite Scraper (웹 데이터 크롤러 & AI 추출기)
- **Slug**: `whbsite-scraper`
- **버전**: `v1.04`
- **배지**: `["new", "free"]` (가입 회원 누구나 무료 사용)
- **라이브 도메인**: `https://whbsite-scraper.buylife.xyz` (기존 `https://ghost-scraper.buylife.xyz` 유지)
- **목적**: 웹사이트 URL을 입력하여 메타데이터, 헤딩 구조, 글목록, 표, 링크, 이미지를 실시간 스크래핑하고, Gemini AI로 비정형 웹 리스트를 구조화된 데이터(순번, 제목, 링크, 썸네일)로 자동 추출하는 지능형 웹 데이터 수집 솔루션.

## 2. 핵심 불변 원칙 준수
1. **사용자 본인 API 키 원칙 (최상위 규칙)**: Google Gemini API 키는 사용자의 브라우저 `localStorage`에 격리 보관되며, 플랫폼 공용 DB `user_api_keys` 테이블과 `/api/user/key`로 동기화된다. 운영자 공용 키 폴백 없음.
2. **AIMaster 통합 이용 권한 게이트**: `src/lib/access.ts`의 `requireProgramAccess()` 적용으로 비로그인 접근 시 메인 SSO(`https://buylife.xyz/login`)로 307 리다이렉트. `free` 배지로 로그인 회원은 즉시 무료 사용.
3. **좌측 메뉴 표준 규격 (`docs/SIDEBAR_LAYOUT_STANDARD.md`)**:
   - 상단 프로그램명 + 버전 `v1.04` + FREE 배지
   - `← 다른 프로그램 보기`
   - 대시보드 메인
   - 번호형 작업 흐름 (1: URL 입력 & 탐색 → 2: 데이터 검토 & 분류 → 3: 시각적 섹터 선택 → 4: AI 지능형 분석)
   - 세션 통계 요약 카드 & `데이터 내보내기 (JSON)`
   - `🔑 API키등록·플랫폼연동`
   - 하단 고정: 로그인 계정 이메일 & 로그아웃 버튼
4. **당해 연도(현재 2026년) 원칙**: 모든 AI 프롬프트와 분석 결과에 당해 연도(2026년) 기준을 동적으로 적용 (`new Date().getFullYear()`).

## 3. 핵심 아키텍처 및 기능
- **POST `/api/crawl`**: Cheerio를 활용하여 HTML 파싱, 메타데이터, 시맨틱 헤딩(H1~H3), 하이퍼링크, 이미지, 데이터 표, 글목록 및 AI 분석용 `cleanedHtml` 추출.
- **GET `/api/proxy`**: 시각적 섹터 선택기용 HTML 프록시. 라이브 웹페이지에 마우스오버 하이라이트 스타일 및 인터셉트 스크립트(`AIS_SECTOR_SELECTED`, `AIS_NAVIGATE_REQUEST`) 주입.
- **GET `/api/proxy-image`**: 이미지 다운로드 CORS 우회 스트리밍 (`JSZip` 일괄 다운로드 지원).
- **GET/POST `/api/user/key`**: Gemini API 키 DB 저장 및 조회.
- **POST `/api/auth/logout`**: 안전한 로그아웃 후 메인 로그인으로 리다이렉트.

## 4. 버전 변경 이력
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
