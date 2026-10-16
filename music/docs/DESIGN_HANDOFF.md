# 음악(SUNO)자동화 (music/) v1.06 디자인 인수인계 문서 (DESIGN_HANDOFF.md)

작성일시: 2026-10-16  
작업 CLI: Antigravity (Windows)  
배포 URL: `https://music-rho-virid-22.vercel.app/` (`https://music-rho-virid-22.vercel.app/remix`)  
적용 버전: `v1.06` (공유 DB `programs.version = 'v1.06'` 동기화 완료)

---

## 1. 디자인 개요 및 스타일 템플릿 명명
- **스타일 템플릿 공식 명칭**: **`사이버 수노 다크 스튜디오 스타일 (Cyber Suno Dark Studio Style)`**
- **모티브/컨셉**: Suno 공식 웹사이트(`suno.com/discover`, `suno.com/create`)의 딥 다크 콘솔과 비비드 앰버 오렌지 네온 액센트, 라운드 알약형(Pill) 컨트롤 UI 구현.

---

## 2. 디자인 시스템 및 컬러 토큰 사양
| 토큰 이름 | 색상 코드 | 용도 및 설명 |
| :--- | :--- | :--- |
| **Deep Background** | `#09090b` | 전체 페이지 퓨어 딥 블랙 배경 |
| **Studio Surface** | `#121217` | 사이드바 배경 및 서브 컨테이너 |
| **Card Surface** | `#14141b` | 메인 콘텐츠 및 위젯 다크 글래스 카드 |
| **Card Border** | `#272732` / `#2b2b3b` | 다크 카드 테두리 및 구분선 |
| **Brand Orange** | `#f97316` | Suno 브랜드 메인 앰버 오렌지 |
| **Brand Amber Hover** | `#ea580c` / `#d97706` | 버튼 및 링크 호버 상태 |
| **Neon Accent** | `#fb923c` | 활성 탭 및 글로우 인디케이터 |
| **Primary Text** | `#ffffff` / `#f4f4f5` | 고대비 헤더 및 굵은 타이틀 텍스트 |
| **Secondary Text** | `#d4d4d8` / `#a1a1aa` | 본문 및 레이블 텍스트 |
| **Muted Text** | `#71717a` / `#52525b` | 메타 정보 및 안내 문구 |

---

## 3. 주요 컴포넌트 및 레이아웃 구조
1. **사이드바 (`components/layout/Sidebar.tsx`)**:
   - `SUNO` 브랜드 엠블럼 + `v1.06` 버전 배지.
   - 3단계 워크플로우 네비게이션:
     - 1단계: 🎼 음악 기획 (`/plannings/new`)
     - 2단계: 🎵 음악 생성 · 트랙 관리 (`/plannings`)
     - 3단계: 🎛️ 음악 Remix 스튜디오 (`/remix`)
   - Suno Discover 바로가기 링크 및 AIMaster 허브 링크.
   - 하단 접속 계정 및 다크 스타일 로그아웃 버튼.
2. **비주얼 프로세스 가이드 (`components/guide/SunoUsageGuide.tsx`)**:
   - STEP 1(컨셉&가사) ➔ STEP 2(고음질 생성) ➔ STEP 3(Remix) 3단계 프로세스 다이어그램 시각화.
   - 프롬프트 작성 꿀팁 및 API 연동 아코디언 매뉴얼 내장.
3. **리믹스 허브 (`app/(dashboard)/remix/page.tsx`, `components/remix/RemixCard.tsx`, `RemixForm.tsx`)**:
   - 다크 글래스모피즘 카드 및 트랙 썸네일/오디오 플레이어.
   - 원클릭 상태 새로고침, 알약형 새 리믹스 시작 버튼.
4. **트랙 생성/관리 콘솔 (`app/(dashboard)/plannings/`, `components/plannings/TrackCard.tsx`)**:
   - 보컬 버전 / BGM(인스트루멘탈) 선택 카드.
   - 알약형(Pill) 장르/무드/악기/보컬톤/템포 태그 칩 (`TagChips.tsx`).
   - 트랙별 연장, 리믹스, MR(보컬 제거), 24bit WAV 다운로드 알약 액션 바.
5. **로그인/회원가입 셸 (`app/(auth)/layout.tsx`, `app/(auth)/login/page.tsx`, `app/(auth)/signup/page.tsx`)**:
   - 딥 블랙 & 오렌지 네온 앰버 테마 적용으로 비로그인 진입 시에도 일관된 다크 스튜디오 감성 유지.

---

## 4. Microsoft Edge 브라우저 전용 실세션 검수 증거
- **검수 브라우저**: **Microsoft Edge (`msedge.exe`) 전용** (규칙 준수, Chrome 배제).
- **테스트 계정**: `buylifemall@naver.com` (일반 회원 인증 세션 검수 완료).
- **생성된 검수 아티팩트**:
  - 데스크톱 로그인: `edge_suno_login_desktop.png` (1440 × 900)
  - 데스크톱 리믹스 메인: `edge_suno_remix_desktop.png` (1440 × 900)
  - 데스크톱 곡 기획 목록: `edge_suno_plannings_desktop.png` (1440 × 900)
  - 데스크톱 새 리믹스 폼: `edge_suno_remix_new_desktop.png` (1440 × 900)
  - 모바일 리믹스 반응형: `edge_suno_remix_mobile.png` (375 × 812)

---

## 5. 배포 정보
- **배포 플랫폼**: Vercel Production
- **배포 ID**: `dpl_HWnfTfVbwFPbytSr43ghKctQEULa`
- **배포 도메인**: `https://music-rho-virid-22.vercel.app` (HTTP 200 정상)
- **DB 동기화**: `programs` 테이블 `music-automation`의 `version` 컬럼 = `v1.06`
