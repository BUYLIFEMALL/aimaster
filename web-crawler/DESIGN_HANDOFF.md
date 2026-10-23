# 디자인 인수인계 — 웹 크롤링 자동화 (web-crawler/webapp) · v1.07 · 2026-10-17 Claude Code(맥미니)

> ※ `web-crawler/.gitignore`가 `docs/`를 제외해 디자인 문서를 폴더 최상위에 둔다.

## 1. 템플릿
**스마트 매트릭스 스타일 (다크 슬레이트, Tailwind v4)** — 루트 `DESIGN.md` 템플릿 4번. `ghost-scraper`의 `globals.css`(@theme `mx-*`)·`PageHero`·`KpiCard`를 그대로 가져옴(부동산 실거래 v1.11과 같은 계열). 사이드바는 `real_estate_sales` 스텝퍼 사이드바를 이식.

## 2. 색 토큰 (`webapp/src/app/globals.css` @theme)
| 토큰 | 값 | 쓰임 |
|---|---|---|
| `mx-bg` | `#0f1115` | 전체 배경(로그인 포함) |
| `mx-surface` / `mx-raised` | `#171a21` / `#1f2430` | 카드 / 카드 안 칸·마우스 올림 |
| `mx-border` | `#2a3040` | 선 |
| `mx-text` / `mx-muted` | `#e6e9ef` / `#8b93a7` | 본문 / 보조 글자 |
| `mx-primary` / `-strong` | `#2563eb` / `#1d4ed8` | 기본 버튼·선택 |
| `mx-link` | `#93c5fd` | 링크·수집 중 글자 |
| `mx-accent` | `#f59e0b` | 확인 필요·STEP 표시 |
| `mx-success` / `mx-danger` | `#10b981` / `#f43f5e` | 완료 / 실패 |

상태 칩: 대기 회색 · 수집 중 파랑(깜빡이는 점) · 확인 필요 앰버 · 완료 초록 · 실패 빨강 (`components/jobs/StatusBadge.tsx`).

## 3. 컴포넌트 구조
- `components/layout/Sidebar.tsx` — 🏠 대시보드 / STEP 1 ➕ 새 작업 만들기 / STEP 2 📋 작업 목록 / 🔑 설정 / 📖 매뉴얼, 계정·로그아웃은 메뉴 바로 아래. **`/jobs`와 `/jobs/new`가 함께 선택되지 않도록 `isActivePath` 별도 판정.** 휴대폰(767px 이하) 위쪽 바 + ☰.
- `components/ui/PageHero.tsx`(배지·제목·설명·팁·버튼), `components/ui/KpiCard.tsx`(왼쪽 색 막대, `tone`에 **red 추가**).
- 대시보드: 히어로 → 상태 KPI 5칸 → 지금 수집 중 강조(있을 때만) → 최근 작업 표(최대 8개, 엑셀 링크) → 작업 흐름 4단계 → 프로그램 소개(접기).
- 새 작업·작업 목록·설정: 기존 h1 → PageHero, 기능 코드 변경 없음.
- `/guide`(신규): 캐릭터 말풍선, 5단계, 상태 5가지 뜻, TIP/주의, 키 발급 매뉴얼 팝업 4개, FAQ 4개.
- 로그인: 다크 격자 배경, 탭·버튼 파랑 토큰.

## 4. 모바일
- 767px 이하 사이드바 숨김 → 위쪽 바 + ☰ 펼침 메뉴(항목·순서 같음).
- 최근 작업 표는 가로 스크롤(`min-w-[640px]`), KPI는 2열, 매뉴얼 단계는 1열.

## 5. 주의사항
- 일괄 치환으로 바꾼 색이라, 새 화면을 만들 때 `neutral-*`·`bg-white`를 쓰지 말고 `mx-*` 토큰을 쓴다.
- 「우회해서 계속 진행」 버튼은 앰버 바탕 + 검은 글자(대비 확보).
- 매뉴얼의 「30일 자동 삭제」 문구는 **기능이 아직 없어 넣지 않았다**(IMPROVEMENTS #5).
- 화면 검수 때 「새 작업 시작」·「우회해서 계속 진행」은 실제 수집이 돌기 때문에 누르지 않는다.
