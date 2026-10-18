# 티스토리(원문)생성 자동화 (tistory-auto-blog) 디자인 개발완료 보고서 (DESIGN_HANDOFF.md)

> **작성일**: 2026-10-18  
> **작성자**: Antigravity (Windows)  
> **완료 버전**: `v1.82`  
> **공식 서비스 URL**: https://tistory-auto-blog.buylife.xyz  
> **적용 디자인 템플릿**: **플로우 위저드 스타일 — 티스토리 오렌지 앰버 에디션 (Flow Wizard Style — Tistory Orange Amber Edition)**

---

## 1. 템플릿 시스템 및 컬러 토큰 스펙

| 토큰 분류 | 명칭 / CSS 클래스 | HEX 코드 | 용도 및 적용 컴포넌트 |
|---|---|---|---|
| **Background** | `bg-slate-50` | `#f8fafc` | 프로그램 전체 페이지 단일 배경 (일관성 100%) |
| **Surface** | `bg-white` | `#ffffff` | 대시보드 카드, 사이드바, 가이드 카드, 모달 |
| **Border** | `border-slate-200` | `#e2e8f0` | 카드 테두리, 헤더/사이드바 구분선 |
| **Brand Primary** | `bg-orange-500` / `text-orange-600` | `#f97316` | 플로우 스텝퍼 원형, 메인 CTA 버튼, 활성 칩 |
| **Brand Hover/Dark** | `bg-orange-600` / `text-orange-700` | `#ea580c` | 버튼 호버 상태, 브랜드 강조 타이틀 |
| **Brand Tint** | `bg-orange-50` / `ring-orange-100` | `#fff7ed` | 활성 메뉴 배경, 스텝퍼 링 글로우, 배지 |
| **Text Main** | `text-slate-900` | `#0f172a` | 대제목, 카드 헤더, 핵심 KPI 수치 |
| **Text Body** | `text-slate-700` / `text-slate-600` | `#334155` | 본문 설명, 체크리스트, 가이드 안내문 |
| **Text Muted** | `text-slate-400` / `text-slate-500` | `#94a3b8` | 날짜, 힌트, 비활성 아이콘, 부가 메타정보 |

---

## 2. 주요 리뉴얼 컴포넌트 구조

### 2.1 사이드바 스텝퍼 & 모바일 햄버거 헤더/드로어 (`BlogSidebar.tsx` & `BlogShell.tsx`)
- **데스크톱(1440px)**:
  - 좌측 고정 사이드바(256px), 상단 T 그라디언트 배지 + `v1.82 · 플로우 위저드` 칩.
  - 3단계 플로우 스텝퍼(1단계 주제수집 ➔ 2단계 AI글쓰기 ➔ 3단계 글관리) 세로 파이프라인 시각화.
  - 유틸리티 메뉴: `🔑 API키·플랫폼연동` (`/settings`), **`📖 연동 & 사용 매뉴얼` (`/guide`) 신설 연결**.
- **모바일(375px~390px)**:
  - 상단 슬림 헤더(h-14, sticky top-0, 로고 + 현재 페이지 타이틀 + ☰ 햄버거 버튼).
  - ☰ 버튼 터치 시 좌측 슬라이딩 드로어(Drawer) 및 딤 오버레이(Dim) 연출.
  - 메뉴 클릭 시 드로어 자동 닫힘 처리, 모바일 가로스크롤 넘침(overflow-x) 0px 방어.

### 2.2 4단계 파이프라인 비주얼 가이드북 (`app/guide/page.tsx`)
- `DESIGN.md` 원칙 4 & 9번에 따른 전면 시각적 가이드북 신설:
  1. **5단계 원스톱 자동화 파이프라인 다이어그램**: 확장 설치 ➔ 블로그 이름 연동 ➔ API 키 등록 ➔ 주제수집 및 AI 글생성 ➔ 1-Click 자동 입력.
  2. **단계별 핵심 가이드 및 실전 체크리스트**: 각 단계별 필수 확인사항 체크 표시.
  3. **키캡 치트시트 & 에디터 팁 3종**: 닫힌 탭 복구(Ctrl+Shift+T), 서식 소실 방지 엔진, 30분 자동 큐 창.
  4. **트러블슈팅 FAQ 아코디언 5종**: 블로그 이름 입력법, 이어쓰기 창 자동 취소, 보호글 정책, 쇼츠 중복 차단, 이미지 30일 보관 정책.

### 2.3 대시보드 및 전 화면 테마 일체화 (`app/dashboard/page.tsx`, `app/auth/*` 등)
- 전 화면 단일 배경색(`#f8fafc`) 일체화로 화면 이동 시 시각적 일체감 제공.
- 대시보드 3종 KPI 카드(내 게시글, 수집된 글감 후보, 티스토리 카테고리) 및 프로그램 공식 소개 카드 앰버 테마 조화.
- 로그인/회원가입 표준 탭 토글 레이아웃(`app/auth/auth-form.tsx`) 컬러 오렌지 앰버 테마 동기화.

---

## 3. Microsoft Edge 실세션 검수 결과 (포그라운드)

- **검수 환경**: Microsoft Edge 포그라운드 브라우저 (`headless: false`), 일반 회원 테스트 계정(`buylifemall@naver.com`) 실세션 로그인.
- **수집된 캡처 아티팩트 (5종)**:
  1. `edge_tistory_desktop_dashboard_v182.png`: 1440px 데스크톱 대시보드 및 플로우 스텝퍼 사이드바.
  2. `edge_tistory_desktop_guide_v182.png`: 1440px 데스크톱 비주얼 가이드북 및 5단계 파이프라인.
  3. `edge_tistory_mobile_dashboard_v182.png`: 375px 모바일 슬림 헤더 및 반응형 카드 레이아웃.
  4. `edge_tistory_mobile_drawer_v182.png`: 375px 모바일 햄버거 메뉴 터치 후 슬라이딩 드로어 노출.
  5. `edge_tistory_mobile_guide_v182.png`: 375px 모바일 가이드북 및 가로 넘침 없음 검증.

---

## 4. 버전 및 배포 정보
- **배포 버전**: `v1.82` (DB `programs.version`, `extension_version`, `utils/version.ts`, `manifest.json`, ZIP 아카이브 일치)
- **Vercel 배포 ID**: `dpl_6BqPUAAuxjs5r7u8nUgBwtfSQLRE`
- **프로덕션 도메인**: https://tistory-auto-blog.buylife.xyz
- **확장 릴리스 검증**: `node scripts/check-extension-release.mjs tistory-auto-blog` ➔ `OK (DB v1.82 / ext v1.82 / zip v1.82)`
