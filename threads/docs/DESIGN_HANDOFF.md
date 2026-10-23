# Threads 포스팅 자동화 (auto-threads-posting) 디자인 핸드오프

> **프로그램명**: Threads 포스팅 자동화 (`auto-threads-posting`)  
> **버전**: `v1.17`  
> **적용 디자인 템플릿**: **스레드 바이럴 스튜디오 스타일 (Threads Viral Studio Style)**  
> **서비스 공식 URL**: https://auto-threads-posting.buylife.xyz  
> **검수 브라우저**: Microsoft Edge (포그라운드 `headless: false` 실세션 검수 완료)  
> **검수 일자**: 2026-10-17  
> **담당 CLI**: Antigravity (`agy`)

---

## 1. 디자인 리뉴얼 배경 및 목적
1. **Threads 패밀리 일관성 완성**: `threads-creator` (기획), `threads-analytics` (분석), `threads-video-flow` (영상), `threads-affiliate-poster` (제휴)에 이어 본 프로그램인 60번 `auto-threads-posting`까지 리뉴얼함으로써 Threads 계열 5개 전체 100% 바이럴 스튜디오 스타일 통일 달성.
2. **시인성 및 대비 최적화**: 기존 라이트 톤의 밋밋한 UI를 세련된 딥 다크 콘솔(`#171717` 캔버스, `#1f1f1f` 카드)과 앰버/바이올렛 액센트로 전환하여 장시간 작업 시 눈의 피로를 최소화.
3. **가이드북 신설**: 기존에 완전히 누락되어 있던 사용 매뉴얼 라우트(`/guide`)를 완전 신설하여 Meta Threads 공식 API 연동법 및 4단계 포스팅 워크플로우를 직관적으로 제공.
4. **모바일 반응형 완비**: 375px 모바일 뷰포트에서 상단 고정 헤더와 햄버거 슬라이드 드로어 메뉴를 신설하여 모바일 포스팅 및 관리가 완벽하게 가능하도록 지원.

---

## 2. 디자인 컬러 토큰 & 테마 스펙

| 토큰명 | 색상 코드 / 값 | 용도 |
| :--- | :--- | :--- |
| **Canvas Background** | `#171717` (`neutral-900`) | 전체 메인 배경 캔버스 |
| **Card Surface** | `#1f1f1f` (`neutral-800/90`) | 대시보드 카드, 섹션 컨테이너 |
| **Sidebar Background** | `#141414` (`neutral-950`) | 데스크톱 좌측 내비게이션 바 및 모바일 드로어 |
| **Primary Accent** | `#f59e0b` (`amber-500`) | Threads 브랜드 및 주요 CTA 버튼, 하이라이트 텍스트 |
| **Secondary Accent** | `#8b5cf6` (`purple-500` / `violet-500`) | AI 및 자동화 뱃지, 상태 배지 |
| **Border / Divider** | `#262626` (`neutral-800`) | 카드 테두리 및 섹션 구분선 |
| **Text Primary** | `#f5f5f5` (`neutral-100`) | 메인 헤드라인 및 주요 본문 |
| **Text Secondary** | `#a3a3a3` (`neutral-400`) | 보조 설명문, 타임스탬프, 메타데이터 |

---

## 3. 핵심 컴포넌트 구조 및 구현 내역

### 1) 모바일 반응형 상단 고정 헤더 & 슬라이드 드로어
- **파일**: `src/components/layout/Sidebar.tsx`
- **구현**: 
  - 모바일(화면 폭 < 1024px)에서 상단에 `h-14` 고정 헤더(`fixed top-0 inset-x-0 z-40 bg-[#141414] border-b border-neutral-800`) 노출.
  - 앱 타이틀, `v1.17` 앰버 배지, 햄버거 토글 버튼 배치.
  - 햄버거 클릭 시 부드러운 백드롭(`bg-black/60`)과 함께 좌측에서 슬라이드 인되는 드로어 메뉴 제공.

### 2) 사용 가이드북 (`/guide/page.tsx`) 완전 신설
- **신설 라우트**: `src/app/(dashboard)/guide/page.tsx`
- **구성**:
  - **헤더 배너**: 🤖 AI 마스코트 말풍선 및 `v1.17` 배지.
  - **4단계 프로세스 카드**: API 연동 ➔ 주제 수집 ➔ AI 글/이미지 조립 ➔ 즉시/예약 발행.
  - **Meta Threads 계정 연동 가이드**: 콜백 URL(`https://auto-threads-posting.buylife.xyz/api/threads/callback`) 및 테스터 승인 3단계 안내.
  - **500자 제약 & 알고리즘 공략 팁**: 후킹, 여백, 나노바나나 고화질 이미지, 타래 유도 노하우.
  - **FAQ 4종**: 토큰 승인 오류, 권장 AI 모델, 스케줄러 주기, 글자 수 제한 등.

### 3) 대시보드 (`/dashboard/page.tsx`) 다크 테마 정돈
- 환영 배너, 4단계 워크플로우 카드(가이드 링크 연동), 5종 상태 카운터(`임시저장`, `예약됨`, `게시 중`, `게시 완료`, `게시 실패`), 다가오는 예약 목록을 다크 카드 기반으로 일관되게 정돈.

---

## 4. 실세션 Edge 브라우저 검수 결과 증빙
- `edge_threads_posting_desktop_dashboard_v117.png`: 데스크톱 1440px 대시보드 뷰
- `edge_threads_posting_desktop_guide_v117.png`: 데스크톱 1440px 가이드북 뷰
- `edge_threads_posting_mobile_dashboard_v117.png`: 모바일 375px 대시보드 뷰
- `edge_threads_posting_mobile_menu_v117.png`: 모바일 375px 드로어 메뉴 열림 뷰
- `edge_threads_posting_mobile_guide_v117.png`: 모바일 375px 가이드북 반응형 뷰
