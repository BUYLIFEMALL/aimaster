# Threads 콘텐츠 운영 자동화 — UI/UX 디자인 개발완료 보고서 (DESIGN_HANDOFF.md)

> **문서 상태**: 디자인 1차 완료 보고서 (Production Ready)  
> **작성 일자**: 2026-10-16  
> **작성 에이전트**: Antigravity CLI (`agy`, Windows)  
> **프로그램**: `threads-content-ops` (Threads 콘텐츠 운영 자동화)  
> **버전**: `v1.97` (사이드바 대시보드 검은색 덩어리 및 텍스트 묻힘 버그 해결 완료)  
> **프로덕션 URL**: [https://threads-content-ops.buylife.xyz](https://threads-content-ops.buylife.xyz) (가이드북: [https://threads-content-ops.buylife.xyz/?tab=guide](https://threads-content-ops.buylife.xyz/?tab=guide))  
> **적용 표준**: [`DESIGN.md`](../../DESIGN.md), [`docs/PROGRAM_DESIGN_STANDARD.md`](../../docs/PROGRAM_DESIGN_STANDARD.md), [`docs/SIDEBAR_LAYOUT_STANDARD.md`](../../docs/SIDEBAR_LAYOUT_STANDARD.md)

---

## 1. 디자인 작업 총괄 요약

주인님의 2026-10-16 지침("좌측에 매뉴얼 메뉴가 없는 프로그램은 기본적으로 매뉴얼 메뉴 추가, 쉽고 자세한 단계별 사용 매뉴얼 추가, 작업 완료 시 작업 내용 및 추가 개선 제안 항목별 정리 및 인수인계 문서 의무화")에 따라, `threads-content-ops`에 **`스레드 바이럴 스튜디오 스타일`** 1차 리뉴얼을 적용하고 **단계별 사용 매뉴얼 가이드북** 및 **모바일 반응형 햄버거 메뉴**를 완벽하게 구축하였습니다.

---

## 2. 적용 디자인 템플릿: `스레드 바이럴 스튜디오 스타일`

### 2.1 톤앤매너 및 비주얼 아이덴티티
- **베이스 감성**: Meta Threads 고유의 미니멀 모노크롬(Clean White & Ink Black) 기반.
- **포인트 액센트**: 바이럴 폭발력을 상징하는 **파이어 앰버(Fire Amber, `#f59e0b`)**와 미래지향적 AI를 상징하는 **일렉트릭 바이올렛(Electric Violet, `#8b5cf6`)**.
- **가독성 보장**: 기존 `.threads-content-ops-light`로 인해 어두운 배경 위에서 텍스트가 묻히던 현상을 라이트 톤 프리미엄 카드(앰버-슬레이트 그라디언트)와 인라인 명시적 스타일(`style={{ color: '#ffffff' }}`)로 완전 해결.

### 2.2 메인 컬러 토큰 명세
| 토큰명 | CSS / Tailwind 클래스 | 실제 HEX 값 | 사용처 |
|---|---|---|---|
| **Primary Surface** | `bg-white` | `#ffffff` | 메인 워크스페이스 배경 |
| **Secondary Surface** | `bg-neutral-50` / `bg-slate-50` | `#f8fafc` | 사이드바, 가이드 카드 배경 |
| **Brand Amber** | `bg-amber-500`, `text-amber-600` | `#f59e0b` | 활성 가이드북 메뉴, 1~5단계 번호 칩 |
| **Hero Card Border** | `border-amber-200/90` | `#fde68a` | 가이드북 히어로 배너 테두리 |
| **Text Primary** | `text-neutral-900` | `#0f172a` | 대제목, 메인 헤드라인 |
| **Text Secondary** | `text-neutral-700` / `text-neutral-600` | `#334155` | 본문 설명, 가이드 상세 가이드 |
| **Version Badge** | `border-neutral-300 bg-neutral-100` | `#f1f5f9` | 사이드바 및 모바일 헤더 `v1.96` 배지 |

---

## 3. 핵심 컴포넌트 구조 및 구현 내역

### 3.1 좌측 사이드바 (`ContentOpsSidebar.tsx`)
- **표준 레이아웃 준수**:
  - 브랜드 헤더: `Threads 운영 자동화` + `v1.96` 배지 + `← 다른 프로그램 보기` (`/programs`)
  - `🏠 대시보드`
  - 5단계 파이프라인 (세로 타임라인 + 번호형 뱃지: 1 수집 ➔ 2 생성 ➔ 3 보관함 ➔ 4 계정 ➔ 5 제휴상품)
  - 유틸리티: `🔑 API키등록·플랫폼연동` + **`📖 연동 & 사용 매뉴얼` (`?tab=guide` 신설)**
  - **계정 및 로그아웃 밀착**: 마지막 메뉴 바로 아래 8~16px 간격으로 `buylifemall@naver.com` 카드 및 로그아웃 버튼 배치 (`mt-3 shrink-0 border-t pt-3`).
- **모바일 호환성**: `isMobile` 및 `onCloseMobile` props를 지원하여 데스크톱 고정 사이드바와 모바일 슬라이드 드로어 양쪽에서 100% 동일한 메뉴 제공.

### 3.2 단계별 비주얼 사용 매뉴얼 (`UsageGuide.tsx`)
초보자도 5분 만에 마스터할 수 있도록 5개 인터랙티브 탭으로 구성된 비주얼 가이드북 구축:
1. **1. 5단계 올인원 파이프라인**: 1단계 글감 수집 ➔ 2단계 500자 AI 생성 ➔ 3단계 즉시/예약 발행 ➔ 4단계 계정 브랜딩 ➔ 5단계 제휴상품 연동까지 번호형 시각적 카드 맵.
2. **2. Meta & API 연동 매뉴얼**: Meta for Developers 앱 생성, Threads API 필수 권한(`threads_basic`, `threads_content_publish`), OAuth 콜백 URL(`https://www.buylife.xyz/api/threads-content-ops/callback`) 원클릭 복사 기능 탑재.
3. **3. 6대 바이럴 페르소나 비법**: 공감형 에세이, 직설형 인사이트, 데이터 분석가, 위트 일상러, 트렌드 큐레이터, 1인 창업가 6종 화자의 특성과 실전 추천 훅(Hook) 예시 수록.
4. **4. 쇼핑제휴 머니타이징**: 쿠팡 파트너스 API 키 없는 직접 HTML 등록 4단계 가이드 및 공정위 필수 문구 자동 삽입 규정 안내.
5. **5. 자주 묻는 질문 (FAQ)**: 500자 초과 시 대처법, 60일 토큰 만료 갱신법, PC 종료 후에도 작동하는 Vercel Cron 클라우드 예약 원리 등 아코디언 탑재.

### 3.3 모바일 반응형 햄버거 헤더 & 드로어 (`MobileNav.tsx`)
- 768px 미만 스마트폰(375~390px) 접속 시 상단 고정 헤더 바(`h-14`) 제공 (`@ Threads 운영 v1.96 ☰`).
- 햄버거 버튼 터치 시 배경 딤과 함께 좌측에서 부드럽게 슬라이드되는 오버레이 메뉴 드로어 탑재.
- 메인 본문 컨테이너 상단에 `pt-20` 여백을 부여하여 고정 헤더와 제목 텍스트 간 겹침 현상 완전 제거.

---

## 4. Microsoft Edge 실세션 검수 결과 증적

- **검수 환경**: Microsoft Edge (`msedge.exe`), 일반 회원 테스트 계정 (`buylifemall@naver.com`)
- **검수 산출물 캡처**:
  1. `edge_threads_ops_guide_v196.png`: 데스크톱 1440px 가이드북 메인 및 사이드바 검수 완료 (명암비 100% 정상).
  2. `edge_threads_ops_guide_meta_v196.png`: 데스크톱 Meta 연동 탭 및 콜백 URL 복사 UI 정상 동작.
  3. `edge_threads_ops_guide_persona_v196.png`: 데스크톱 6대 페르소나 카드 갤러리 정상 동작.
  4. `edge_threads_ops_mobile_v196.png`: 모바일 390px 상단 헤더, 패딩 겹침 없음, 본문 가로 넘침 없음 확인.
  5. `edge_threads_ops_mobile_menu_v196.png`: 모바일 햄버거 메뉴 터치 시 슬라이드 드로어 메뉴 정상 작동 확인.

---

## 5. 추가 개선 제안 과제 (Next Steps)
1. **대시보드 KPI 및 5단계 가로형 프로세스 맵 위젯 구현 (`IMP-04`)**:
   - `OperationsDashboard.tsx` 중앙에 1~5단계 실시간 데이터 건수 및 원클릭 이동 가로형 프로세스 바 배치.
2. **500자 실시간 게이지 프로그레스 바 고도화 (`IMP-05`)**:
   - `AttentionComposer.tsx` 에디터에 450자 이상 시 앰버, 500자 도달 시 레드 경고 애니메이션 바 적용.
3. **콘텐츠 보관함 내 드래그앤드롭 다중 이미지 업로더 (`IMP-06`)**.
