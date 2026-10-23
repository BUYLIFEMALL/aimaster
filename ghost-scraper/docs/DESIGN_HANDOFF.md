# 디자인 개발완료 인수인계 — Website Scraper (v1.12)

- **적용 디자인 템플릿**: **스마트 매트릭스 스타일 (Smart Matrix Style)** — 루트 `DESIGN.md` 템플릿 4번. 기준 구현 [`longtail-keyword-expander/docs/DESIGN_HANDOFF.md`](../../longtail-keyword-expander/docs/DESIGN_HANDOFF.md)의 토큰·부품을 **Tailwind v4로 옮긴 두 번째 적용 사례**
- **작업**: Claude Code(맥미니), 2026-10-16 · 플랜: [PLAN_20261016_DESIGN_RENEWAL.md](PLAN_20261016_DESIGN_RENEWAL.md)
- **상태**: ✅ 1차 작업완료 (`v1.12`, 스마트 매트릭스 스타일). Windows 빌드·프로덕션·일반 회원 Edge 검수 완료(7절).

## 1. Tailwind v4로 옮길 때의 차이 (다른 v4 프로그램에 이식할 때 참고)

| 항목 | v3 (롱테일) | v4 (이 프로그램) |
|---|---|---|
| 색 토큰 | `tailwind.config.ts`의 `colors.mx` + `:root` 변수 | `app/globals.css`의 `@theme { --color-mx-*: … }` → `bg-mx-bg`·`text-mx-muted` 등 자동 생성 |
| 공통 클래스 | `@apply` | `@layer components`에 **일반 CSS + `var(--color-mx-*)`** (v4 `@apply` 차이를 피함) |
| 투명도 | CSS 변수 색은 `/60` 불가 | v4는 `@theme` 색에도 `/60` 가능하지만, 칩은 v3와 같게 고정 `rgb(… / 0.6)` 사용 |
| 입력창 | `.input` | `.mx-input` |

## 2. 컬러 토큰 (`@theme`)

| 토큰 | 값 | 용도 |
|---|---|---|
| `mx-bg` / `mx-surface` / `mx-raised` | `#0f1115` / `#171a21` / `#1f2430` | 배경 / 카드·메뉴 / 카드 안 강조면·입력·표 hover |
| `mx-border` | `#2a3040` | 1px 테두리 |
| `mx-text` / `mx-muted` | `#e6e9ef` / `#8b93a7` | 본문 14.3:1 / 보조 5.66:1 (surface 위) |
| `mx-primary` (+`-strong`) | `#2563eb` / `#1d4ed8` | 주요 버튼(흰 글자 5.17:1)·활성 단계 |
| `mx-link` | `#93c5fd` | 활성 메뉴·링크 (raised 위 8.6:1) |
| `mx-accent` / `mx-success` / `mx-danger` | `#f59e0b` / `#10b981` / `#f43f5e` | 단계 아이콘·버전 칩 / FREE·CSV·등록됨 / 오류·로그아웃 |

## 3. 공통 부품

| 부품 | 파일 | 설명 |
|---|---|---|
| CSS 클래스 | `src/app/globals.css` | `.mx-card` `.mx-kpi` `.mx-btn-primary/ghost/danger`(44px) `.mx-chip(-blue/-amber/-green)` `.mx-input` `.mx-table` `.mx-toggle(-active)` |
| `PageHero` · `KpiCard`/`KpiGrid` | `src/components/ui/` | 롱테일과 같은 모양 |
| 탭 공통 | `ScraperTabs.tsx` 안 `TabHeader`·`CsvButton`·`SearchBox`·`OpenLink` | 탭마다 제목 + 검색 + CSV 버튼 배치 통일 |
| `Sidebar` | `src/components/layout/Sidebar.tsx` | 데스크톱 `md:flex` 좌측 고정, 휴대폰은 헤더 ☰ → 왼쪽 서랍. 계정 칸은 마지막 메뉴 바로 아래(메뉴만 스크롤). `activePage="guide"`로 매뉴얼 강조 |
| `GuideShell` | `src/components/guide/GuideShell.tsx` | `/guide`에서 같은 사이드바·헤더를 쓰는 틀. 단계 클릭은 `/`로, API키는 `/?settings=1`로 이동(작업 화면이 설정 창을 바로 연다) |

## 4. 화면별 구현

| 화면 | 내용 |
|---|---|
| `/` 작업 화면 | 히어로 → (오류 배너) → STEP 1 URL 카드(추천 칩·⚡크롤링·섹터 선택) → **KPI 4종**(글목록·링크·이미지·AI 정리 항목) → 7탭 |
| 7탭 | 다크 탭 바(개수 칩) · 개요(메타·기술 정보 4칸) · AI 분석(표 + 검색 + CSV, 대기 안내) · 구조(H1/H2 칩) · 글목록(2열 카드 + 검색) · 표(TABLE 칩 + CSV) · 링크(표 + 외부 칩 + 검색) · 이미지(그리드 + ZIP 결과 안내) |
| 시각적 섹터 선택 | 기존 다크 화면을 `mx` 토큰으로 통일, 휴대폰은 미리보기 위·인스펙터 아래(최대 45vh) |
| `/guide` (신규) | 캐릭터 말풍선 · 5단계(소요 시간) · 7탭 지도 · 마우스 단축키 키캡 · TIP/주의 · Gemini 키 발급 3단계 · FAQ |
| 설정 모달 | 「🔑 API키등록·플랫폼연동」 제목, 본인 키 안내, 다크 입력·버튼 |

## 5. 유지보수 주의

- 색은 `mx-*` 토큰만 쓴다. 새 색이 필요하면 `@theme`에 추가.
- 🚨 **미리보기(`/api/proxy`)의 `Content-Security-Policy: sandbox allow-scripts`와 iframe `sandbox="allow-scripts"`를 지우거나 `allow-same-origin`을 추가하지 않는다** — 남의 사이트 스크립트가 회원 키를 읽을 수 있게 된다.
- 외부 주소 fetch는 반드시 `safeFetch()`를 거친다(내부 주소 차단).
- 767px 이하에서 좌측 메뉴는 서랍으로만. 표는 카드 안 가로 스크롤.
- 회원 화면에 「주인님」 호칭 금지.

## 6. 윈도우 인수 완료

2026-10-16 Codex(Windows)가 인수 순서를 완료했습니다. 아래 실제/합성 검사 범위와 미검수 항목을 다음 CLI도 구분합니다.

## 7. 배포·검수 기록 — 2026-10-16 Codex(Windows)

| 항목 | 값 |
|---|---|
| 맥미니 원본 / Windows 보완 커밋 | 184f282c / bd9a2388c0880da065590ad84d790b01482b2543 (원격 푸시 완료) |
| 로컬 빌드 | npm run build 및 보안 보완 후 npm run build:verify 성공, Next.js 16.2.11 TypeScript 포함 |
| 프로덕션 | dpl_HjwYj14feCUNkyUUgszi7NVpTwga READY, 고정 git archive 소스 배포 |
| 서비스 | https://website-scraper.buylife.xyz |
| DB | programs.version v1.12, app_url 유지, badges=[new] 유지 |
| VIP 사용권한 | 138/138 유효, 가입일+365일 불일치 0 (기존 권한 조회만 수행) |
| 격리 보안 | 26/26, 내부 주소 연결 없이 URL·DNS pinning·리디렉트 경계 재현 |
| 실제 일반 회원 Edge | 로컬/운영 각 15개 묶음 검사 통과, buylifemall@naver.com (관리자 아님) |
| 운영 API | 비로그인 crawl/proxy/proxy-image/key 4개 401, 회원 내부 URL 12개 400, HTML 이미지 응답 415 |
| Tailwind v4 | body rgb(15,17,21), card rgb(23,26,33) 실제 계산 색상 일치 |
| 화면 | 1440px·375px, 실제 공개 페이지 크롤링/KPI/7탭/검색, 모바일 메뉴·섹터 모달·/guide 가로 넘침 없음 |
| 비용·회원 데이터 | 유료 AI 호출 0, 회원 키·환경변수·등급·권한 변경 없음 |

- [배포 증거](evidence/deployment-v112.json), [운영 결과](evidence/runtime-live.json), [로컬 결과](evidence/runtime-local.json), [보안 결과](evidence/security.json). 운영 캡처: [1440px](evidence/live-desktop.png), [375px](evidence/live-mobile.png), [매뉴얼](evidence/live-guide-mobile.png).
- 실제 섹터 프록시 응답·CSP·iframe 격리·저장소 접근 차단·부모 위조 메시지 무시를 검증했습니다. 선택 스크립트의 클릭/Shift/Ctrl는 iframe 안 DOM만 합성했고 Ctrl 이동의 다음 페이지 프록시/크롤링 응답은 모의 처리했습니다.
- 글목록 검색·표 CSV는 합성 크롤링 응답으로 실제 UI·다운로드 내용을 확인했습니다. 설정 저장은 키 POST를 모의 처리했습니다. 실제 이미지 다운로드 및 공통 CSP 헤더를 확인했으며, 악성 SVG 자체 실행 실험은 하지 않았습니다.
- **미검수**: Gemini 실제 응답/비용·모델 품질, 회원 키 실제 신규 저장, 이미지 ZIP 대량 다운로드, 모든 외부 사이트 호환. 기존 AI 모델·FREE 표시·의존성 이슈는 [개선 원장](IMPROVEMENTS.md) #7/#15/#16으로 남깁니다.
