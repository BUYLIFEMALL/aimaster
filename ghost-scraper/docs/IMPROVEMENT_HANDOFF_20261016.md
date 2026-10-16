# 개선 인수인계 — Website Scraper (2026-10-16, Claude Code 맥미니)

## 한 일
- v1.12: 보안 3건(API 권한·SSRF 차단·미리보기 격리) + 스마트 매트릭스 디자인 + `/guide` + 작은 수정 4건. 상세: [PLAN_20261016_DESIGN_RENEWAL.md](PLAN_20261016_DESIGN_RENEWAL.md), [DESIGN_HANDOFF.md](DESIGN_HANDOFF.md), 개선 원장 [IMPROVEMENTS.md](IMPROVEMENTS.md).

## 바뀐 파일
- 신규: `src/lib/safeFetch.ts`, `src/components/ui/PageHero.tsx`, `src/components/ui/KpiCard.tsx`, `src/app/guide/page.tsx`, `src/components/guide/GuideShell.tsx`, `docs/*`
- 수정: `src/app/api/{crawl,proxy,proxy-image,user/key}/route.ts`, `src/app/globals.css`, `src/app/layout.tsx`, `src/components/{ScraperWorkspace,layout/Sidebar,layout/Header,scraper/UrlInputSection,scraper/ScraperTabs,modals/SettingsModal,modals/SectorModal}.tsx`, `src/lib/version.ts`(v1.12)
- 삭제: `src/components/modals/HelpModal.tsx`(→ `/guide`로 대체)

## 확인한 것 / 못 한 것
- 확인: 코드 정적 검토(import·타입·클래스), 매뉴얼 문구를 실제 코드(수집 개수 제한·외부 링크 표시·저장 방식)와 대조.
- **못 한 것**: `npm run build`, 배포, 화면 검수 — 맥미니 빌드·배포 금지(원칙 18-④). Tailwind v4 `@theme` 토큰(`bg-mx-*`)이 실제로 생성되는지 빌드에서 확인 필요.

## 다음 첫 단계 (윈도우 CLI)
1. `cd ghost-scraper && npm run build` — 오류 수정.
2. `vercel deploy --prod --yes` (프로젝트 `website-scraper`) → DB `update programs set version='v1.12', updated_at=now() where slug='website-scraper';`
3. 보안 검수: 비로그인 `curl -X POST https://website-scraper.buylife.xyz/api/crawl -d '{"url":"https://example.com"}' -H 'content-type: application/json'` → 401, `/api/proxy?url=https://example.com` → 401, 로그인 상태에서 `http://127.0.0.1` 수집 → 400 안내.
4. 화면 검수(`buylifemall@naver.com`, 1440px·375px): 크롤링 → KPI·7탭·검색·CSV, 섹터 선택(클릭·Shift·Ctrl 이동, 모바일 세로 배치), `/guide`, 사이드바 계정 밀착·☰ 메뉴, 설정 모달 저장.
5. 결과를 `DESIGN_HANDOFF.md` 7절에 기록, 루트 `DESIGN.md` 21번을 ✅ 1차 완료(`v1.12`)로, `docs/ACTIVE_WORK.md`의 Claude Code(맥미니) 줄 삭제.
