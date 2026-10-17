# Threads 포스팅 자동화 (auto-threads-posting) v1.17 디자인 리뉴얼 & 시스템 규격화 플랜

> **작성일**: 2026-10-17  
> **작성자**: Antigravity CLI (`agy`, 윈도우)  
> **대상 프로그램**: `auto-threads-posting` (폴더 `threads/`, https://auto-threads-posting.buylife.xyz)  
> **목표 버전**: `v1.16` → `v1.17`  
> **적용 디자인 템플릿**: **스레드 바이럴 스튜디오 스타일 (Threads Viral Studio Style)**  

---

## 1. 개요 및 목적
- **프로그램 개요**: Meta Threads 공식 API(OAuth)와 AI(OpenAI, Google Gemini, Claude)를 연동하여 포스팅 주제 수집, 500자 최적화 바이럴 카피라이팅, 나노바나나 AI 이미지 생성, 즉시 및 예약 자동 발행을 수행하는 원스톱 SNS 마케팅 자동화 SaaS.
- **작업 목적**:
  1. 기존 라이트 테마를 Meta Threads 특유의 미니멀 모노 다크 콘솔 감성(**스레드 바이럴 스튜디오 스타일**, `#171717` 캔버스 + `#1f1f1f` 카드 + `#f59e0b` 앰버 & `#8b5cf6` 바이올렛)으로 전면 리뉴얼.
  2. 375px 모바일 뷰 최적화를 위한 상단 고정 헤더 및 햄버거 드로어 오버레이 메뉴 신설.
  3. 현재 완전히 누락되어 있는 **비주얼 사용 매뉴얼 (`/guide`) 신규 구축** 및 사이드바 메뉴 연동 (`📖 연동 & 사용 매뉴얼`).
  4. 대시보드 통계 카드 및 프로세스 안내 카드 다크 테마 일관화.
  5. 7대 핵심 항목 규격화 문서(`AGENTS.md`, `README.md`) 및 인수인계 문서 3종(`DESIGN_HANDOFF.md`, `IMPROVEMENTS.md`, `IMPROVEMENT_BACKLOG.md`) 구축.

---

## 2. 디자인 템플릿 규격 및 컬러 시스템
- **템플릿 공식 명칭**: **스레드 바이럴 스튜디오 스타일 (Threads Viral Studio Style)**
- **컬러 토큰**:
  - **Main Canvas Background**: `#171717` (Threads 메인 다크 캔버스)
  - **Surface / Card Background**: `#1f1f1f` (카드 및 패널 서페이스)
  - **Elevated / Border**: `#262626` / `#333333` (다크 테두리 및 구분선)
  - **Text Colors**: `#ffffff` (메인 타이틀), `#e5e5e5` (본문), `#a3a3a3` (보조 설명)
  - **Brand Accent 1 (Viral Amber)**: `#f59e0b` (주목도, 전환 CTA, 주요 배지)
  - **Brand Accent 2 (Electric Violet)**: `#8b5cf6` (AI 생성, 주제 분석, 탭 강조)
  - **Brand Accent 3 (Publish Emerald)**: `#10b981` (발행 완료, 정상 상태)

---

## 3. 세부 구현 계획

### 1) 레이아웃 & 사이드바 (`Sidebar.tsx`, `layout.tsx`, `globals.css`)
- 글로벌 CSS 다크 테마 토큰 및 RootLayout body 다크 클래스 적용.
- 모바일(375px) 상단 고정 헤더 신설 (타이틀 + 버전 칩 + 햄버거 토글 버튼).
- 모바일 슬라이드 드로어 메뉴 신설 (화면 클릭 시 닫힘, 라우트 이동 시 자동 닫힘).
- 데스크톱 사이드바 다크 모노 테마 전면 리뉴얼.
- 사이드바 메뉴에 `📖 연동 & 사용 매뉴얼` (`/guide`) 신규 등록.

### 2) 비주얼 사용 매뉴얼 (`/guide/page.tsx`) 신규 구축 (완전 신설)
- **캐릭터 말풍선 안내**: "🤖 Threads 포스팅 어시스턴트: 실시간 주제 탐색부터 AI 500자 캡션 작성, 나노바나나 고화질 이미지 조립, 예약 스케줄링까지 완벽하게 자동화하세요!"
- **4단계 핵심 워크플로우 비주얼 다이어그램 카드**:
  - STEP 1 🔑 플랫폼 & API 연동 (Threads OAuth, OpenAI/Gemini/Claude 키 1회 등록)
  - STEP 2 🔍 주제 & 아이디어 수집 (키워드/RSS/직접 입력, AI 트렌드 요약)
  - STEP 3 📝 AI 캡션 & 카드뉴스 생성 (500자 제약 준수, 10종 페르소나 및 이미지 조립)
  - STEP 4 ⚡ 즉시 포스팅 & 예약 발행 (즉시 게시 및 클라우드 스케줄러 자동 실행)
- **Meta 앱 연동 & OAuth 설정 가이드 박스**: 유효한 리디렉션 URI 복사 및 테스터 등록 절차 안내.
- **Threads 500자 제약 & 알고리즘 공략 팁**.
- **자주 묻는 질문 (FAQ) 4종 아코디언 카드**.

### 3) 대시보드 (`/dashboard/page.tsx`) 다크 테마 정돈
- 다크 캔버스 배경 및 통계 카드 5종 다크 톤 일치.
- 상단 프로그램 소개 박스 및 4단계 사용 가이드 카드 다크 앰버/바이올렛 칩 시각화.
- 다가오는 예약 게시 목록 다크 테두리 및 텍스트 시인성 확보.

### 4) 인수인계 및 규격화 산출물 구축
- `threads/docs/DESIGN_HANDOFF.md` 작성
- `threads/docs/IMPROVEMENTS.md` 작성 (3대 과제 및 타 프로그램 탐색 제안)
- `threads/docs/IMPROVEMENT_BACKLOG.md` 작성
- `threads/AGENTS.md` 및 `README.md` 7대 핵심 항목 완벽 갱신
- 루트 `DESIGN.md` 60번 `✅ 1차 작업완료 (v1.17, 스레드 바이럴 스튜디오 스타일)` 갱신
- 루트 `docs/ACTIVE_WORK.md` 내 줄 삭제 및 `docs/HANDOFF.md` 최신 작업 내역 등록

---

## 4. 검수 및 배포 계획
1. **로컬 빌드 검증**: `cd threads && npm run build` (타입/컴파일 오류 0건).
2. **프로덕션 배포 및 DB 동기화**:
   - `update programs set version = 'v1.17', updated_at = now() where slug = 'auto-threads-posting';`
   - `vercel deploy --prod --yes`
3. **Microsoft Edge 포그라운드 실세션 검수**:
   - `headless: false` 설정으로 Edge 브라우저 실행.
   - 일반 회원 테스트 계정(`buylifemall@naver.com`) 세션 주입 후 데스크톱(1440×900) 및 모바일(375×812) 캡처 검수.
4. **비용**: 유료 API 호출 미수행으로 **0원** 준수.
