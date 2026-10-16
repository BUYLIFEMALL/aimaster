# 디자인 개발완료 인수인계 — Website Scraper (v1.12)

- **적용 디자인 템플릿**: **스마트 매트릭스 스타일 (Smart Matrix Style)** — 루트 `DESIGN.md` 템플릿 4번. 기준 구현 [`longtail-keyword-expander/docs/DESIGN_HANDOFF.md`](../../longtail-keyword-expander/docs/DESIGN_HANDOFF.md)의 토큰·부품을 **Tailwind v4로 옮긴 두 번째 적용 사례**
- **작업**: Claude Code(맥미니), 2026-10-16 · 플랜: [PLAN_20261016_DESIGN_RENEWAL.md](PLAN_20261016_DESIGN_RENEWAL.md)
- **상태**: 코드 완료 · **윈도우 빌드·배포·화면 검수 대기** (7절)

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

## 6. 남은 검수 (윈도우 CLI)

[IMPROVEMENT_HANDOFF_20261016.md](IMPROVEMENT_HANDOFF_20261016.md) 「다음 첫 단계」 참고 — 빌드, 배포, DB v1.12, 보안 `curl` 검수, 1440px·375px 화면 검수.

## 7. 배포·검수 기록

| 항목 | 값 |
|---|---|
| 코드 커밋 | (이 문서와 같은 커밋) |
| 빌드·배포 | 대기 |
| DB `programs.version` | v1.11 (배포 때 v1.12) |
| 화면·보안 검수 | 대기 |
