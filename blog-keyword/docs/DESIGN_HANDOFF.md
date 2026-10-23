# 디자인 개발완료 인수인계 — AI 블로그 키워드 자동화 (v1.05)

- **적용 디자인 템플릿**: **스마트 매트릭스 스타일** — 루트 `DESIGN.md` 템플릿 4번. 세 번째 적용(기준 `longtail-keyword-expander` Tailwind v3, `ghost-scraper` Tailwind v4, **이 프로그램은 일반 CSS**)
- **작업**: Claude Code(맥미니), 2026-10-16 · 플랜 [PLAN_20261016_DESIGN_RENEWAL.md](PLAN_20261016_DESIGN_RENEWAL.md)
- **상태**: ✅ 1차 작업완료 (`v1.05`, 스마트 매트릭스 스타일, 2026-10-17 Antigravity 검수·배포 완료)

## 1. 일반 CSS 프로그램에 옮기는 방법 (다른 일반 CSS 프로그램 이식용)

1. `globals.css` 맨 위 `:root`에 `--mx-*` 12개 토큰을 넣는다(값은 2절).
2. 기존 변수(`--brand`·`--line`·`--muted`·`--background`·`--foreground`)를 토큰으로 연결 → 기존 클래스가 그대로 다크로 바뀐다.
3. 파일 안 하드코딩 색(`#fff`·`#eef2ff`·`#f0fdf4` 등)을 토큰 또는 반투명 고정색(`rgb(30 58 138 / .5)` 등)으로 바꾼다. `color-scheme:dark`로 기본 입력창·스크롤도 어둡게.
4. **클래스 이름은 바꾸지 않는다**(테스트가 의존) — 새 부품만 `mx-` 접두어로 추가.

## 2. 컬러 토큰 (`src/app/globals.css :root`)

| 토큰 | 값 | 기존 변수 연결 |
|---|---|---|
| `--mx-bg` / `--mx-surface` / `--mx-raised` | `#0f1115` / `#171a21` / `#1f2430` | `--background` = surface |
| `--mx-border` | `#2a3040` | `--line` |
| `--mx-text` / `--mx-muted` | `#e6e9ef` / `#8b93a7` | `--foreground` / `--muted` |
| `--mx-primary` (+`-strong`) | `#2563eb` / `#1d4ed8` | `--brand` (흰 글자 5.17:1) |
| `--mx-link` · `--mx-accent` · `--mx-success` · `--mx-danger` | `#93c5fd` · `#f59e0b` · `#10b981` · `#f43f5e` | 활성 메뉴·링크 / 단계 라벨(eyebrow)·버전 칩 / 좋음 / 로그아웃·오류 |

## 3. 새 부품 (`src/app/kw.css` 끝 「v1.05」 블록)

| 부품 | 클래스·파일 | 설명 |
|---|---|---|
| 히어로 | `.mx-hero*` · `components/ui/PageHero.tsx` | 배지·제목·설명·💡팁·오른쪽 버튼 |
| 지표 카드 | `.mx-kpi-grid` `.mx-kpi(.amber/.green/.muted)` · `components/kw/DashboardStats.tsx` | 위쪽 색 막대, 4열 → 1100px 이하 2열 |
| 기록 도구 | `.kw-hist-tools` `.kw-filter` · `HistoryList.tsx` | 검색 + 분석 종류 칩(개수) |
| 매뉴얼 | `.gd-bubble` `.gd-avatar` `.gd-pipeline` `.gd-time` | 캐릭터 말풍선, 4단계 흐름(›), 767px 이하 2열 |

기존 부품의 다크 처리: 눌린 버튼(`aria-pressed`) 파란 반투명, 점수 링 배경 `raised`, 추이 막대 `primary`, 키 상태 칩(초록/앰버), 모달·검색창 다크.

## 4. 화면별

| 화면 | 변경 |
|---|---|
| `/dashboard` | 히어로(STEP 1, 기록·매뉴얼 버튼) → 지표 4종 → 기존 작업대(그대로) |
| `/history` | 히어로(STEP 2, 새 분석 버튼) → 검색·즐겨찾기·칩 카드 → 기록 목록 |
| `/settings` | 히어로 + 다크 키 카드 |
| `/guide` | 히어로 → 캐릭터 말풍선 → 4단계 흐름 → 기존 목차·내용 |
| `/login`·`/setup` | 같은 토큰으로 다크(구조 그대로) |

## 5. 유지보수 주의
- 색은 `--mx-*`만. 새 하드코딩 색 금지(반투명 칩 색 제외).
- 테스트 의존: 버튼 이름(「분석하기」「즐겨찾기만 보기」「키 등록」「연결 확인」 등), `.kw-history`, `data-group` — 바꾸면 `tests/browser.mjs`도 함께 수정.
- 사이드바 폭 256px(`md:w-64` 상당), 767px 이하 위쪽 ☰ 메뉴(v1.03 규칙 유지), 계정 칸은 메뉴 바로 아래.
- 회원 화면에 「주인님」 금지. "AI 추정"과 "실측" 배지 구분 유지(AGENTS.md).

## 6. 검수 완료 내역
- 2026-10-17 Antigravity(윈도우) CLI 검수 완료:
  - 단위 테스트: `npm test` 13건 전수 통과
  - 빌드: Next.js 16.4.0 Turbopack 프로덕션 빌드 정상 통과
  - 배포: Vercel Production 배포 완료 (`https://blog-keyword.buylife.xyz`)
  - DB 버전: Supabase DB `programs` 테이블 `v1.05` 갱신 완료
  - Edge 검수: Microsoft Edge 포그라운드(화면 노출 `headless: false`) 실세션 검수 통과 (데스크톱 1440px / 모바일 375px)

## 7. 배포·검수 기록

| 항목 | 값 |
|---|---|
| 코드 커밋 | `6e7fd9c2` (맥미니) / 배포·검수 커밋 (윈도우 Antigravity) |
| 테스트·빌드·배포 | ✅ 완료 (`npm test` 통과, Next.js 빌드 성공, Vercel Production 배포 완료) |
| DB `programs.version` | ✅ `v1.05` 갱신 완료 (`https://blog-keyword.buylife.xyz`) |
| 화면 검수 | ✅ 완료 (Microsoft Edge 포그라운드 실세션 검수, 데스크톱 1440px / 모바일 375px) |
| 상태 | ✅ 1차 작업완료 (`v1.05`, 스마트 매트릭스 스타일) |
