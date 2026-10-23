# 개선사항 원장 (IMPROVEMENTS.md)

## 2026-10-19 디자인 리뉴얼 & 가이드북 구축 완료 (v1.20) — Antigravity (Windows)

### 1. 적용 완료 사항
- **스타일 전면 개편**: **플로우 위저드 스타일 — 캘린더 리마인드 에디션** 구축
  - 클린 화이트 테마 + 캘린더 블루/에메랄드/인디고 포인트 컬러 적용
  - `.studio-hero` 배너: 캘린더 리마인드 헤더, `v1.20` 배지, 15분 주기 자동 크론 가동 상태 인디케이터
  - 3대 핵심 KPI 카드: 등록 예약 수(대기/완료/노쇼), 활성 리마인드 규칙 수, 발송 채널 연동 상태(알림톡/문자, 메일, 텔레그램)
  - 3단계 플로우 파이프라인 가이드 바 탑재
  - 사이드바 표준화: 3단계 스텝퍼 번호, `📖 연동 & 사용 매뉴얼` (`/guide`) 메뉴 신설, 모바일 햄버거 토글 드로어
- **독립 비주얼 가이드북 (`/guide/page.tsx`) 신설**:
  - 4단계 리마인드 타임라인 시퀀스 (D-3, D-1, 당일 3시간 전, 방문 후 2시간)
  - 발송 채널별 비교 및 연동 매트릭스 표 (알림톡 vs SMS/LMS vs 메일 vs 텔레그램)
  - 동적 치환 태그 가이드 (`#{고객명}`, `#{예약일시}`, `#{메모}`)
  - 100% BYOK 공용 DB 회원 소유 격리 보안 원칙 배너
  - 자주 묻는 질문(FAQ 5종) 아코디언 컴포넌트
- **버전 3중 동기화 (`v1.20`)**: `package.json` (`1.20.0`), `lib/version.ts` (`v1.20`), Supabase DB `programs` (`v1.20`)
- **실세션 검수 완료**: Microsoft Edge 포그라운드(headless: false) 7종 캡처 수집 및 10분간 화면 유지 세션 완료.

### 2. 신규 발견 인사이트 및 후속 고도화 제안 (미구현 / 아이디어 백로그 연계)
- **아이디어 1: 네이버 예약 / 구글 캘린더 연동(양방향 동기화)**
  - 네이버 예약 파트너센터 API나 구글 캘린더 iCal URL을 연동하여 매장에서 수동으로 입력하지 않아도 자동으로 예약이 수집되고 리마인드가 발송되는 원클릭 동기화 시스템 도입 제안.
- **아이디어 2: 알림톡 내 [예약 확정] / [일정 변경] 인터랙티브 버튼 지원**
  - 고객이 카카오 알림톡을 받았을 때 버튼 하나로 "예약 확정"을 누르면 대시보드에 실시간 반영되고, "일정 변경" 버튼을 누르면 상담 채널로 연결되는 기능.

---

## 2026-10-19 플랫폼 분석 — 추가 검토·개발 제안 (미구현)

F-008: 예약 알림의 선점 전 발송·실패 재시도 누락, F-009: 예약 메시지의 시간대가 서버 기본값 의존, F-010: 예약 Cron의 현재 회원 자격 재확인 누락, F-011: Cron 인증 비밀 누락 시 fail-closed 아님 — 제안·미수정. 운영 설정/코드/조건부를 구분한 [분석 인수인계](IMPROVEMENT_HANDOFF_20261019_ANALYSIS.md)와 공통 보고서의 검수/승인 기준을 확인합니다. 이미 구현된 내용은 새 결함으로 되돌리지 않습니다.

## 2026-10-20 v1.21 처리·발견 (Claude Code 윈도우)
- ✅ F-008(선점 전 발송) 해결 — 발송 전 `booking_reminder_sends` 선점. ✅ F-010(Cron 회원 자격 재확인) 해결 — 실행 직전 이용 권한 확인. ✅ F-011(Cron 비밀값 빈 값) 해결. 상세 `AGENTS.md` v1.21. F-009(시간대)는 미처리.
- 🆕 발견(미수정, 다음 배포 때): 규칙 「켜기」가 실패(「내 cron-job.org」인데 키 없음 등)하면 서버가 규칙을 다시 끄고 안내를 돌려주지만 `components/reservations/ReminderRulesSection.tsx` `handleToggle`이 결과를 버려 화면에 안내가 안 보인다. crm-google-form v1.10에서 같은 문제를 고친 방식(`toggleError` 상태 + 규칙 줄 아래 문구) 그대로 옮기면 된다.
- **✅ 배포됨 v1.28(2026-10-23, 데스크톱 폭 계정 위치 확인) — 이전 「미배포 대기」(커밋 `22c6cda35`)**: 좌측 메뉴 계정·로그아웃이 화면 맨 아래로 밀리던 것을 마지막 메뉴 바로 아래(8~16px)로 — `docs/SIDEBAR_LAYOUT_STANDARD.md` 「계정 이메일·로그아웃 위치」(메뉴 `flex-1`/틀 `justify-between`/계정 `mt-auto` 제거). 클래스만 바꿈, tsc 통과. **다음 배포 때 함께 내보내고(버전 +0.01) 데스크톱·휴대폰 폭에서 계정 위치 확인 후 이 줄과 `docs/PENDING_DEPLOYS.md` 줄 지우기.** (Claude Code 윈도우, YOUTUBE Shots v1.38과 같은 수정)

## 2026-10-23 미배포 대기 — SOLAPI 발송 코드 공용 기준 코드 `solapi-client` (Claude Code 윈도우 · 세션 `claude-win-20261023-solapi-shared`)
- 주인님 승인(「진행, 미배포 대기」). 플랜: `crm-google-form/docs/PLAN_20261023_SOLAPI_SHARED.md`. 기준 `crm-google-form/lib/solapi/client.ts`, 사본 5곳(booking-reminder·stepmail·kakao_auto_poster·trending-product-finder·real_estate_sales) — **사본은 직접 고치지 말고 기준을 고친 뒤 `node scripts/check-shared-modules.mjs --sync`.** 계정 저장 `lib/actions/solapiAccount.ts`는 프로그램마다 기능이 달라 공용 아님.
- 사본 등록(내용 원래 같음). **버그 수정**: crm-google-form 코드를 복사해 남아 있던 다른 프로그램 이름 3곳 — SOLAPI 테스트 문자 「[구글폼 CRM]」·이메일 계정 테스트 발송 제목·본문 「구글폼 CRM」·텔레그램 연동 완료 메시지 「구글폼 CRM 자동화 … 새 신청이 접수되면」 → 「예약(취소)방지 리마인드 자동화」(`lib/actions/solapiAccount.ts`·`smtpAccounts.ts`·`telegram.ts`).
- 배포: 미배포 대기(급하지 않은 공용 변경·작은 문구 버그) — 다음 배포 때 버전 +0.01.
