# 디자인 리뉴얼 개발 플랜 — Website Scraper (2026-10-16, v1.11 → v1.12)

- **작업자**: Claude Code(맥미니) · **주인님 지시**: 「다음 디자인 리뉴얼 작업은 https://website-scraper.buylife.xyz/ 로 하자」
- **적용 템플릿**: 스마트 매트릭스 스타일 (루트 `DESIGN.md` 템플릿 4번, 기준 구현 `longtail-keyword-expander`)
- **폴더**: `ghost-scraper/` (slug `website-scraper`) · Next.js 16 · React 19 · **Tailwind v4** (기준 구현은 v3 → `@theme`로 옮김)

## 1. 사전 분석 (지침 8번)

| 항목 | 현재 상태 |
|---|---|
| 라우트 | `/`(작업 화면 1개, 단계는 화면 상태로 전환) · API `/api/crawl` `/api/proxy` `/api/proxy-image` `/api/user/key` `/api/auth/logout` |
| 화면 | URL 입력 → 7탭(개요·AI 분석·구조·글목록·표·링크·이미지) · 시각적 섹터 선택(전체 화면 iframe + 인스펙터) · 설정 모달 · 도움말 모달 |
| 데이터 흐름 | `/api/crawl`(Cheerio 파싱) → 화면 + `localStorage`(마지막 1건) · AI 분석은 브라우저에서 회원 본인 Gemini 키로 직접 호출 · 키는 `localStorage` + `user_api_keys`(provider `gemini`) |
| 외부 연동 | Google Gemini(회원 본인 키) · 대상 웹사이트 fetch |
| 권한 | 페이지는 `requireProgramAccess()` · FREE 배지 |

**발견한 문제**
1. 🚨 `/api/crawl`·`/api/proxy`·`/api/proxy-image`에 로그인·권한 확인이 없음(원칙 1 위반) — 누구나 서버를 대리 접속 통로로 사용 가능, 내부 주소 차단도 없음(SSRF). `/api/user/key`는 로그인만 확인.
2. 🚨 `/api/proxy`가 남의 사이트 HTML·스크립트를 **우리 도메인에서 sandbox 없이** 띄움 → 그 사이트 스크립트가 `localStorage`의 Gemini 키를 읽거나 `/api/user/key`로 키를 가져갈 수 있음.
3. 디자인: 흰 배경 위주, `/guide` 페이지·메뉴 없음(지침 9번), 계정 칸이 화면 맨 아래로 밀림(`justify-between`), 내보내기 파일의 버전 고정(`v1.08`), ZIP 이름 `ghost_`, 실패 시 `alert()`.

## 2. 구현 순서

| 단계 | 내용 | 검수 방법 |
|---|---|---|
| 0 보안 | API 4개 `checkProgramAccessApi()` + `dynamic`/`fetchCache` · `lib/safeFetch.ts`(사설·내부 주소 차단, 리디렉트마다 재검사) · 프록시 응답 `CSP: sandbox allow-scripts` + iframe `sandbox="allow-scripts"` + `postMessage` 출처 확인 · 이미지 프록시는 `image/*`만 | 비로그인 `curl`로 4개 API 401 확인, `http://127.0.0.1`·`http://169.254.169.254` 400 확인, 섹터 선택 클릭·이동 동작 확인 |
| 1 디자인 | `@theme` 토큰(`mx-*`) + 공통 클래스 · `PageHero`·`KpiCard` · 사이드바(계정 밀착, 📖 매뉴얼) · 헤더 · 7탭 다크 표 · 글목록/링크/AI 결과 검색 · 설정·섹터 모달 | 1440px·375px 화면 |
| 2 매뉴얼 | `/guide` 신설(캐릭터, 5단계, 7탭 지도, 단축키 키캡, TIP/주의, 키 발급, FAQ) · 헤더 도움말 → `/guide` · `HelpModal` 제거 | `/guide` 화면 |
| 3 작은 수정 | 내보내기 버전 `APP_VERSION`, ZIP `website_scraper_images_*`, ZIP 결과 화면 안내, 섹터 모달 모바일 세로 배치 | 기능 확인 |
| 4 문서 | 이 플랜 · `IMPROVEMENTS.md` · `IMPROVEMENT_HANDOFF_20261016.md` · `DESIGN_HANDOFF.md` · `AGENTS.md` · 루트 `DESIGN.md`·역량 지도·HANDOFF·ERROR_LESSONS | — |

- **비용**: 없음(유료 API 미사용, Gemini는 회원 본인 키).
- **버전**: v1.12 (`src/lib/version.ts`, DB `programs.version`은 배포 때).
- **빌드·배포**: 맥미니 금지 → 윈도우 CLI 요청(`docs/HANDOFF.md`).
