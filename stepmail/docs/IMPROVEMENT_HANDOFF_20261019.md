# 📋 대량 메일발송 자동화(Step Mail) 인수인계 문서 (IMPROVEMENT_HANDOFF_20261019.md)

> **프로그램**: 53번 대량 메일발송 자동화 (`stepmail`)  
> **버전**: `v1.20`  
> **일자**: 2026-10-19  
> **작업자**: Antigravity (Windows)  
> **서비스 주소**: [https://stepmail.buylife.xyz](https://stepmail.buylife.xyz)

---

## 1. 작업 개요 및 목적
- 53번 대량 메일발송 자동화 프로그램의 **플로우 위저드 스타일 — 스텝메일 마케팅 에디션** 전면 디자인 리뉴얼 및 **독립 비주얼 가이드북(`/guide`)** 신설 구축.
- 버전 3중 동기화(`v1.20`), Next.js 16 로컬 빌드 검증, Vercel 프로덕션 배포 완료.
- Microsoft Edge 최전면 포그라운드(headless: false) 7종 캡처 수집 및 10분 화면 유지 실세션 검수 완비.

---

## 2. 세부 변경 사항

### 1) 스타일 & 테마 토큰 (`app/globals.css`)
- 클린 화이트 테마 + 스카이블루(`rgb(2 132 199)`), 로열블루(`rgb(37 99 235)`), 인디고, 에메랄드 포인트 컬러 탑재.
- `.studio-hero`, `.stat-card`, `.guide-card` 클래스 토큰 등록.

### 2) 사이드바 표준화 (`components/layout/Sidebar.tsx`)
- 4단계 플로우 스텝퍼 번호화:
  - Step 1: 📋 잠재고객 DB관리 (`/leads`)
  - Step 2: ✍️ 이메일 작성 (`/drafts`)
  - Step 3: 📧 메일계정 등록 (`/accounts`)
  - Step 4: 🚀 예약 발송 (`/campaigns`)
- 유틸리티 메뉴: `🔑 API키등록·플랫폼연동` (`/settings`), **`📖 연동 & 사용 매뉴얼` (`/guide`)** 신설.
- 모바일 햄버거 토글 드로어 지원.

### 3) 메인 워크스페이스 리뉴얼 (`app/(dashboard)/leads/page.tsx`)
- 와이드 반응형 레이아웃 (`max-w-5xl mx-auto`).
- 상단 `.studio-hero` 배너 (스텝메일 마케팅 콘솔 헤더, `v1.20`, 분할 크론 디스패치 가동 상태 인디케이터, 빠른 액션 버튼 2종).
- 3대 핵심 KPI 카드 (총 잠재고객 리드 현황, 활성 발송 계정 수, 등록된 캠페인 수).
- 4단계 플로우 파이프라인 가이드 바.
- 엑셀 파일 가져오기 폼, 차수별 필터 칩셋, 데이터 테이블 UI 세련화.

### 4) 독립 비주얼 가이드북 신설 (`app/(dashboard)/guide/page.tsx`)
- 4단계 스텝메일 마케팅 프로세스 (DB ➔ 초안 ➔ 연동 ➔ 발송).
- 메일 프로바이더별 일일 한도 및 특성 비교 매트릭스 표 (네이버 vs 다음 vs Gmail vs 사내 SMTP).
- 스팸함 직행을 막는 7대 발송 황금률.
- 100% BYOK 공용 DB 회원 소유 격리 보안 원칙 배너 (Supabase RLS 적용).
- 자주 묻는 질문 (FAQ 5종) 아코디언 컴포넌트.

### 5) 버전 3중 동기화 (`v1.20`)
- `package.json`: `1.20.0`
- `lib/version.ts`: `v1.20`
- Supabase DB `programs` 테이블: `v1.20` (ref `esgxyikcnnvmlhygjkth`)

---

## 3. 검수 결과 및 증거

- **도메인 접속 및 리디렉션 확인**:
  - `curl -I https://stepmail.buylife.xyz` ➔ `307 Temporary Redirect` (`Location: /leads`) 정상 응답.
- **Vercel 프로덕션 배포 완료**:
  - `https://stepmail-3i0oupd9t-buylife.vercel.app` (Alias: `stepmail.buylife.xyz`).
- **Microsoft Edge 포그라운드 실세션 검수 완료**:
  - `edge_stepmail_desktop_main_v120.png`
  - `edge_stepmail_desktop_kpi_v120.png`
  - `edge_stepmail_desktop_table_v120.png`
  - `edge_stepmail_desktop_guide_v120.png`
  - `edge_stepmail_desktop_guide_matrix_v120.png`
  - `edge_stepmail_mobile_main_v120.png`
  - `edge_stepmail_mobile_guide_v120.png`
  - 10분간(600초) 실제 브라우저 창 화면 노출 유지 완비.

---

## 4. 다음 CLI를 위한 안내
- 53번 프로그램의 디자인 리뉴얼 및 가이드북 구축이 완료되어 운영 중입니다.
- 다음 순차 작업 대상은 `DESIGN.md` 목록의 **38번 캐릭코드(MBTI) 측정기 (`mbti-character`)** 또는 **59번 BLOG(원문)생성 자동화 (`ai-auto-blog`)**입니다.
