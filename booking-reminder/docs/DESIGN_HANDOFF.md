# 🎨 예약(취소)방지 리마인드 디자인 핸드오프 (DESIGN_HANDOFF.md)

> **프로그램**: 51번 예약(취소)방지 리마인드 (`booking-reminder`)  
> **버전**: `v1.20`  
> **서비스 주소**: [https://booking-reminder.buylife.xyz](https://booking-reminder.buylife.xyz)  
> **적용 일자**: 2026-10-19  
> **담당**: Antigravity (Windows)

---

## 1. 디자인 컨셉 & 테마 토큰

### 1) 스타일 명칭
**플로우 위저드 스타일 — 캘린더 리마인드 에디션 (Flow Wizard Style — Calendar Reminder Edition)**
- 예약 노쇼(No-Show)를 방지하고 방문율을 극대화하기 위한 직관적인 캘린더 및 리마인드 시퀀스 대시보드.
- 신뢰감 있는 화이트 & 클린 배경(`background: #f8fafc`)에 캘린더 블루(`rgb(37 99 235)`), 에메랄드(`rgb(5 150 105)`), 인디고(`rgb(79 70 229)`) 포인트 컬러 적용.

### 2) 핵심 컴포넌트
1. **`.studio-hero` 배너**:
   - 캘린더 리마인드 자동화 헤더
   - 버전 배지: `v1.20`
   - 실시간 크론 인디케이터: "15분 주기 자동 크론 가동 중"
   - 원클릭 액션 버튼: `📖 사용 가이드북 보기`, `🔑 발송 계정 설정`
2. **3대 핵심 KPI 카드**:
   - 📅 **총 등록 예약**: 예약 대기 / 방문 완료 / 노쇼 통계
   - ⚙️ **리마인드 규칙**: 활성 규칙 수 / 전체 등록 수
   - 📡 **발송 채널 연동 상태**: 카카오 알림톡/문자, 이메일(SMTP), 텔레그램 연동 여부 한눈에 파악
3. **3단계 플로우 파이프라인 가이드 바**:
   - Step 1 (예약 접수 & 등록) ➔ Step 2 (시퀀스 규칙 설정) ➔ Step 3 (15분 자동 발송)
4. **사이드바 표준화 (`Sidebar.tsx`)**:
   - 3단계 스텝퍼 번호 지원 (Step 1 📅 예약 관리, Step 2 ⚙️ 리마인드 규칙, Step 3 📊 발송 현황)
   - 유틸리티 메뉴: `🔑 API키등록·플랫폼연동` (`/settings`), **`📖 연동 & 사용 매뉴얼` (`/guide`)** 신설
   - 반응형 모바일 햄버거 토글 드로어 지원
5. **독립 비주얼 가이드북 (`/guide/page.tsx`)**:
   - 4단계 리마인드 타임라인 시퀀스 (D-3, D-1, 당일 3시간 전, 방문 후 2시간)
   - 채널별 발송 특징 및 비용 매트릭스 비교표 (알림톡 vs SMS vs 메일 vs 텔레그램)
   - 동적 치환 태그 가이드 (`#{고객명}`, `#{예약일시}`, `#{메모}`)
   - 100% BYOK 공용 DB 회원 소유 격리 보안 원칙 배너
   - 자주 묻는 질문(FAQ 5종) 아코디언 컴포넌트

---

## 2. 검수 증거 & 링크

- **실제 서비스 라이브 링크**:
  - 메인 콘솔: [https://booking-reminder.buylife.xyz/reservations](https://booking-reminder.buylife.xyz/reservations)
  - 가이드북: [https://booking-reminder.buylife.xyz/guide](https://booking-reminder.buylife.xyz/guide)
  - 계정 연동: [https://booking-reminder.buylife.xyz/settings](https://booking-reminder.buylife.xyz/settings)
- **검수 환경**: Microsoft Edge 포그라운드 (`headless: false`, 10분간 화면 유지 세션 완비)
- **수집 캡처 7종**:
  1. `edge_booking_desktop_main_v120.png`: 데스크톱 메인 상단 헤더 & 3대 KPI 카드
  2. `edge_booking_desktop_kpi_v120.png`: 데스크톱 3단계 파이프라인 & 신규 예약 등록 폼
  3. `edge_booking_desktop_rules_v120.png`: 데스크톱 리마인드 규칙 & 예약 목록 관리
  4. `edge_booking_desktop_guide_v120.png`: 비주얼 가이드북 상단 & 4단계 시퀀스
  5. `edge_booking_desktop_guide_matrix_v120.png`: 가이드북 채널별 매트릭스 표 & BYOK & FAQ
  6. `edge_booking_mobile_main_v120.png`: 모바일(390x844) 반응형 헤더 & 메인
  7. `edge_booking_mobile_guide_v120.png`: 모바일 가이드북 반응형 뷰
