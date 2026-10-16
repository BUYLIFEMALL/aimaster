# 디자인 개발완료 인수인계 — 롱테일 키워드분석 자동화 (v1.06)

- **적용 디자인 템플릿**: **스마트 매트릭스 스타일 (Smart Matrix Style)** — 루트 `DESIGN.md` 템플릿 4번의 **첫 기준 구현**
- **작업**: Claude Code(맥미니), 2026-10-16
- **상태**: **v1.06 운영 배포·윈도우 검수 완료** — Codex(Windows)가 맥미니 요청을 인수해 빌드·오류 수정·일반 회원 Edge 검수 완료. [결과·재개 문서](IMPROVEMENT_HANDOFF_20261016.md).

## 1. 개발 플랜 (주인님 승인 2026-10-16)

| 항목 | 내용 |
|---|---|
| 문제 | 흰 배경 카드만 나열, 대시보드·사용 매뉴얼 없음, **휴대폰에서 ☰ 메뉴 전환 없음(원칙 19 미적용)**, 실행 시각이 서버(UTC) 기준으로 표시될 수 있음 |
| 범위 | 대시보드(로그인 후 대시보드 화면)만. 로그인·회원가입 화면(`(auth)`)과 서버 로직·DB는 그대로 |
| 비용 | 없음 (유료 API·이미지 생성 사용 안 함) |
| 버전 | v1.05 → **v1.06** (`lib/version.ts`, DB `programs.version`은 배포 때 함께) |

## 2. 컬러 토큰 (`app/globals.css` `:root`, Tailwind `mx-*`)

| 토큰 | 값 | 용도 |
|---|---|---|
| `--mx-bg` | `#0f1115` | 페이지 배경 (다크 차콜) |
| `--mx-surface` | `#171a21` | 카드·좌측 메뉴 |
| `--mx-raised` | `#1f2430` | 카드 안 강조면·입력창·표 행 hover |
| `--mx-border` | `#2a3040` | 1px 테두리 |
| `--mx-text` / `--mx-muted` | `#e6e9ef` / `#8b93a7` | 본문 / 보조 글자 (surface 위 대비 14.3:1 / 5.66:1, raised 위 보조 5.05:1) |
| `--mx-primary` (+`-strong`) | `#2563eb` / `#1d4ed8` | 주요 버튼·활성 단계·관련도 막대 (모던 블루, 흰 글자 대비 5.17:1) |
| `--mx-accent` | `#f59e0b` | 단계 라벨·작업 지시 강조선 (앰버) |
| `--mx-success` / `--mx-danger` | `#10b981` / `#f43f5e` | 등록됨·성공 / 삭제·오류 |

활성 메뉴·링크 글자는 `#93c5fd`(raised 위 8.6:1). 대비는 WCAG 공식으로 계산해 확인했다 — 처음 고른 `#3b82f6` 버튼은 흰 글자 대비 3.68:1로 기준 미달이라 `#2563eb`로 바꿨다. 경고색 `--mx-danger`는 surface 위 4.74:1.

## 3. 공통 부품 (다른 프로그램으로 옮길 때 그대로 복사)

| 부품 | 파일 | 설명 |
|---|---|---|
| CSS 클래스 | `app/globals.css` | `.mx-card` `.mx-kpi*` `.mx-btn-primary/ghost/danger`(높이 44px) `.mx-chip(-blue/-amber/-green)` `.mx-table` `.mx-toggle(-active)` `.input` `.input-sm` |
| `PageHero` | `components/layout/PageHero.tsx` | 화면 맨 위 히어로: 단계 배지 + 제목 + 목적 + 💡팁 + 오른쪽 버튼 |
| `KpiCard` / `KpiGrid` | `components/dashboard/KpiCard.tsx` | 상단 지표 카드 4개(위쪽 색 막대 blue/amber/green/muted), 2열→4열 |
| `SeedMatrix` / `RunMatrix` | `components/seeds/`, `components/runs/` | **검색창 + 필터 칩 + 표/카드 보기 전환** — 스마트 매트릭스의 핵심 |
| `CopyButton` | `components/runs/CopyButton.tsx` | 클립보드 복사 + 「✅ 복사됨」 피드백 |
| `Sidebar` | `components/layout/Sidebar.tsx` | 데스크톱 `hidden md:flex` 좌측 고정(`md:w-64`) + 휴대폰 `md:hidden` 위쪽 바와 ☰ 펼침 메뉴(항목·순서 동일, 이동 시 자동 닫힘) |
| 날짜 표기 | `lib/format.ts` | `Asia/Seoul` 고정 — 서버·브라우저 표시 일치 |

## 4. 화면별 구현

| 화면 | 주요 구현 |
|---|---|
| `/dashboard` (신규, `/` 접속 시 이동) | 히어로 + KPI 4종(씨드·실행·누적 연관·누적 롱테일) + 4단계 작업 흐름 카드 + **키 연결 상태 칩**(SerpApi/OpenAI 등록됨·미등록) + 최근 결과 5개 표 + 프로그램 소개(접기) |
| `/seeds` | 히어로(STEP 1) + KPI(씨드·네이버·구글·총 실행) + 등록 폼 + 표/카드 전환·검색·엔진 필터, 행마다 「⚡ 지금 확장하기」·삭제(확인창) |
| `/runs` | 히어로(STEP 2) + KPI(실행 수·연관 합계·롱테일 합계·마지막 실행) + 검색·표/카드 전환 |
| `/seeds/[id]` · 결과 상세 | 키워드 히어로 + 실행 이력 패널 + KPI(누적 연관·롱테일·직속·평균 관련도) + 작업 지시(앰버 강조선, 「지시문 복사」) + **연관 키워드 매트릭스 표**(관련도 막대 + 롱테일 칩, 「롱테일 전체 복사」) |
| `/guide` (신규) | 안내 캐릭터 말풍선 + 4단계 파이프라인(소요 시간 칩) + 키워드 확장 원리 다이어그램 + 메뉴별 역할 + TIP/주의 박스 + 키 발급 3단계 + FAQ |
| `/settings` | 히어로 + 다크 카드로 정리(기능·문구 그대로) |

## 5. 유지보수 주의사항

- 색은 클래스에 직접 쓰지 말고 `mx-*` 토큰을 쓴다. 토큰은 CSS 변수라 Tailwind 투명도(`/60`)가 안 먹는다 — 투명도가 필요하면 `bg-[#hex]/60`처럼 고정 색을 쓴다(칩 클래스 참고).
- 계정 칸은 마지막 메뉴 바로 아래(구분선 `mt-3`), 메뉴만 내부 스크롤. 계정을 화면 맨 아래로 밀지 않는다.
- 767px 이하에서 좌측 메뉴가 보이면 안 된다(`hidden md:flex` 유지). 표는 카드 안에서 가로 스크롤(`overflow-x-auto` + `min-w`), 페이지 전체는 가로로 넘치지 않는다.
- 버튼은 44px 이상(`mx-btn-*`). 회원 화면에 「주인님」 호칭 금지.
- 모든 호출은 회원 본인 키 — 매뉴얼·대시보드 문구도 이 원칙에 맞춰 썼다.
- 로그인 화면(`(auth)`)은 플랫폼 공통 밝은 디자인을 유지했다(2026-10-01 공통 틀).

## 6. 인수 시 요청된 검수 (2026-10-16 완료, 절차 이력)

1. `cd longtail-keyword-expander && npm run build` — 맥미니에서는 빌드하지 못해 **타입·컴파일 검사가 아직 안 됐다.** 오류가 나면 이 문서의 부품 목록을 기준으로 고친다.
2. `vercel deploy --prod --yes` 후 DB: `update programs set version='v1.06', updated_at=now() where slug='longtail-keyword-expander';`
3. 화면 검수(`buylifemall@naver.com`): `/` → `/dashboard` 이동, 데스크톱 1440px와 375px(☰ 메뉴·가로 넘침 없음), 표/카드 전환, 검색, 복사 버튼, 삭제 확인창.
4. 검수 증거(캡처·배포 ID·커밋)를 이 문서 7절에 추가.

## 7. 배포·검수 기록

| 항목 | 값 |
|---|---|
| 디자인 코드 커밋 | `770f7351` (Claude Code 맥미니) |
| 오류 수정·검수 소스 커밋 | `54eaee73` (Codex Windows, 원격 푸시 완료) |
| 빌드·배포 | 로컬/원격 타입·린트·Next 빌드 통과 · `dpl_GqzpS51EDAxU6UYGCHHt8xkqEhr7` READY |
| 코드 / DB `programs.version` | **v1.06 / v1.06** · 메타데이터 DML만 적용 |
| 실제 일반 회원 화면 | 보이는 Edge 로컬 11/11 + 운영 11/11 · 1440px/375px · 메뉴/이동/빈 상태/소유하지 않은 상세 차단 |
| 데이터 있는 화면 | 보이는 Edge 실제 UI·상세 컴포넌트 합성 검사 12/12 · 검색·필터·표/카드·삭제 취소·복사·한국 시각·등록 후 초기화 |
| 운영 URL | https://longtail-keyword-expander.vercel.app/dashboard |
| 증거 | [배포](evidence/deployment.json) · [운영 회원](evidence/runtime-live.json) · [합성 UI](evidence/browser-fixtures.json) |

실제 일반 회원의 씨드/실행 데이터는 0건입니다. 데이터가 있는 화면은 합성 검사와 구분했으며 유료 확장 실행·텔레그램 발송·실제 회원 데이터 삭제는 하지 않았습니다. 등록 초기화·상세 이력 확인창·복사 실패 안내·빈 UUID 조회 보완은 [검수 인수인계](IMPROVEMENT_HANDOFF_20261016.md)에 기록했습니다. 디자인의 다크 차콜 토큰과 레이아웃은 유지했습니다.
