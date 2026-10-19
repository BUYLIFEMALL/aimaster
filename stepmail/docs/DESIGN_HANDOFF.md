# 🎨 대량 메일발송 자동화 디자인 핸드오프 (DESIGN_HANDOFF.md)

> **프로그램**: 53번 대량 메일발송 자동화 (`stepmail`)  
> **버전**: `v1.20`  
> **서비스 주소**: [https://stepmail.buylife.xyz](https://stepmail.buylife.xyz)  
> **적용 일자**: 2026-10-19  
> **담당**: Antigravity (Windows)

---

## 1. 디자인 컨셉 & 테마 토큰

### 1) 스타일 명칭
**플로우 위저드 스타일 — 스텝메일 마케팅 에디션 (Flow Wizard Style — Stepmail Marketing Edition)**
- 콜드 이메일 및 1~5차 단계별 팔로우업 마케팅을 성공적으로 이끄는 직관적인 대시보드.
- 클린 화이트 바탕(`background: #f8fafc`, `surface: #ffffff`)에 스마트 스카이블루(`rgb(2 132 199)`), 로열블루(`rgb(37 99 235)`), 인디고, 에메랄드 포인트 컬러 적용.

### 2) 핵심 컴포넌트
1. **`.studio-hero` 배너**:
   - 스텝메일 마케팅 콘솔 헤더 타이틀
   - 버전 배지: `v1.20`
   - 실시간 크론 인디케이터: "분할 발송 크론 디스패치 가동 중"
   - 원클릭 액션 버튼: `📖 사용 가이드북 보기`, `🚀 예약 발송 관리`
2. **3대 핵심 KPI 카드**:
   - 📋 **총 잠재고객(리드)**: 전체 리드 수 및 미발송/진행중/완료 현황
   - 📧 **활성 발송 계정**: 연동된 SMTP 계정 수 및 다중 분할 가용 상태
   - 🚀 **발송 캠페인**: 활성 및 예약 대기 캠페인 수
3. **4단계 플로우 파이프라인 가이드 바**:
   - Step 1 (리드 DB 업로드) ➔ Step 2 (이메일 본문 작성) ➔ Step 3 (SMTP 계정 연동) ➔ Step 4 (캠페인 예약 발송)
4. **사이드바 표준화 (`Sidebar.tsx`)**:
   - 4단계 스텝퍼 번호 지원 (Step 1 📋 잠재고객 DB, Step 2 ✍️ 이메일 작성, Step 3 📧 메일계정 등록, Step 4 🚀 예약 발송)
   - 유틸리티 메뉴: `🔑 API키등록·플랫폼연동` (`/settings`), **`📖 연동 & 사용 매뉴얼` (`/guide`)** 신설
   - 반응형 모바일 햄버거 토글 드로어 지원
5. **독립 비주얼 가이드북 (`/guide/page.tsx`)**:
   - 4단계 스텝메일 마케팅 프로세스 카드 (DB ➔ 초안 ➔ 연동 ➔ 발송)
   - 메일 프로바이더별 일일 한도 및 특성 비교 매트릭스 표 (네이버 vs 다음 vs Gmail vs 사내 SMTP)
   - 스팸함 직행을 막는 7대 발송 황금률
   - 100% BYOK 공용 DB 회원 소유 격리 보안 원칙 배너
   - 자주 묻는 질문(FAQ 5종) 아코디언 컴포넌트

---

## 2. 검수 증거 & 링크

- **실제 서비스 라이브 링크**:
  - 메인 리드 콘솔: [https://stepmail.buylife.xyz/leads](https://stepmail.buylife.xyz/leads)
  - 가이드북: [https://stepmail.buylife.xyz/guide](https://stepmail.buylife.xyz/guide)
  - 발송 계정 관리: [https://stepmail.buylife.xyz/accounts](https://stepmail.buylife.xyz/accounts)
  - 캠페인 관리: [https://stepmail.buylife.xyz/campaigns](https://stepmail.buylife.xyz/campaigns)
- **검수 환경**: Microsoft Edge 포그라운드 (`headless: false`, 10분간 화면 유지 세션 완비)
- **수집 캡처 7종**:
  1. `edge_stepmail_desktop_main_v120.png`: 데스크톱 메인 상단 헤더 & 3대 KPI 카드
  2. `edge_stepmail_desktop_kpi_v120.png`: 4단계 파이프라인 & 엑셀 업로드 폼
  3. `edge_stepmail_desktop_table_v120.png`: 차수별 필터 칩 & 리드 테이블
  4. `edge_stepmail_desktop_guide_v120.png`: 비주얼 가이드북 상단 & 4단계 마케팅 프로세스
  5. `edge_stepmail_desktop_guide_matrix_v120.png`: 프로바이더 매트릭스 표 & 스팸 수칙 & FAQ
  6. `edge_stepmail_mobile_main_v120.png`: 모바일(390x844) 반응형 헤더 & 메인
  7. `edge_stepmail_mobile_guide_v120.png`: 모바일 가이드북 반응형 뷰
