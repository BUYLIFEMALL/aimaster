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


## 2026-10-16 Codex(Windows) — 운영 배포 전 로컬 검수

- 최신 지침·공용 DB 정책·작업 중 표·맥미니 원본 커밋 `184f282c`를 대조하고 단독으로 인수했습니다. 개발 플랜: [VERIFICATION_PLAN_20261016.md](VERIFICATION_PLAN_20261016.md).
- Windows `npm run build`, 보안 보완 후 `npm run build:verify` 모두 성공했습니다(Next.js 16.2.11, TypeScript 포함).
- mapped IPv6/link-local 변형의 SSRF 우회 재현 후 차단, DNS 조회 결과를 연결에 고정, 리디렉트 재검사·응답 취소·연결 정리, URL 인증정보 차단을 추가했습니다. URL 상대 경로 기준을 최종 도착 URL로 수정했고 이미지 프록시에 SVG 격리 CSP를 추가했습니다.
- `npm test`: 격리 검사 26/26 통과. 내부 서버에 연결하지 않고 주소 검증·DNS·연결·리디렉트를 검사합니다. 이전 재현은 [evidence/security-before.json](evidence/security-before.json), 수정 후 [evidence/security.json](evidence/security.json).
- 일반 시험 회원 `buylifemall@naver.com`의 실제 세션으로 보이는 Microsoft Edge에서 1440px/375px를 검수했습니다. 검사별 실제/합성 범위는 [evidence/runtime-local.json](evidence/runtime-local.json)에 구분합니다.
- 유료 AI 호출 0회. 회원 키 저장 POST는 모의 응답으로 처리해 실제 키를 바꾸지 않았습니다. AI 결과 품질·실제 키 신규 저장·이미지 ZIP 일괄 다운로드는 이번 검사 범위에서 제외했습니다.
- 배포 전 상태: 코드 APP_VERSION v1.12, DB v1.11, production은 기존 버전입니다. 다음 첫 단계: 이 코드 커밋을 고정 배포 → DB 버전 v1.12 → 운영 Edge 검사 → 이 문서 마지막 완료 기록과 DESIGN 현황판 갱신.
- 주의: 실제 DB 배지는 `["new"]`이며 기존 문서/사이드바의 FREE 고정 표시는 DB와 다릅니다. 권한이나 배지를 임의로 변경하지 않았습니다. 개선 원장 #16에서 후속 처리합니다.
