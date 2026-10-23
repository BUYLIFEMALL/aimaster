# Threads 쇼핑제휴 자동화 (threads-affiliate-poster) v1.61 디자인 리뉴얼 & 시스템 규격화 플랜

> **작성일**: 2026-10-17  
> **작성자**: Antigravity CLI (`agy`, 윈도우)  
> **프로그램 대상**: `threads-affiliate-poster` (https://threads-affiliate-poster.buylife.xyz)  
> **목표 버전**: `v1.60` → `v1.61`  
> **디자인 템플릿**: **스레드 바이럴 스튜디오 스타일 — 쇼핑제휴 변형 (Threads Viral Studio Style - Affiliate Variant)**  

---

## 1. 개요 및 목적
- **프로그램 개요**: 쿠팡파트너스, 알리익스프레스 어필리에이트, 네이버 브랜드커넥트, 토스쇼핑 쉐어링크 상품 정보를 기반으로 Threads 최적화 바이럴 카드뉴스와 홍보 캡션을 AI로 자동 생성·발행하는 마케팅 자동화 SaaS.
- **작업 목적**:
  1. 기존 흰색/회색 위주의 라이트 테마를 Meta Threads 고유의 모노 블랙 감성과 이커머스 쇼핑제휴 포인트 컬러(골드 앰버 & 로열 블루)가 융합된 **스레드 바이럴 스튜디오 스타일 — 쇼핑제휴 변형**으로 전면 리뉴얼.
  2. 모바일 반응형 헤더 및 햄버거 오버레이 메뉴 지원으로 375px 모바일 뷰 완성도 극대화.
  3. 사이드바 표준 명칭(`📖 연동 & 사용 매뉴얼`) 적용 및 4단계 비주얼 사용 매뉴얼(`/guide`) 전면 신규 구축.
  4. 다크 테마 기반의 대시보드 및 프로세스 카드 시각화.
  5. 7대 핵심 항목 규격화 문서(`AGENTS.md`, `README.md`) 및 인수인계 문서 3종(`DESIGN_HANDOFF.md`, `IMPROVEMENTS.md`, `IMPROVEMENT_BACKLOG.md`) 완비.

---

## 2. 디자인 템플릿 규격 및 컬러 시스템
- **템플릿 공식 명칭**: **스레드 바이럴 스튜디오 스타일 — 쇼핑제휴 변형 (Threads Viral Studio Style - Affiliate Variant)**
- **컬러 팔레트**:
  - **Main Background**: `#171717` (Threads 메인 다크 캔버스)
  - **Surface / Card Background**: `#1f1f1f` (카드 및 패널 서페이스)
  - **Elevated / Hover Background**: `#262626` (상승 요소, 리스트 호버)
  - **Border / Divider**: `#333333` / `#2a2a2a` (다크 테두리 및 구분선)
  - **Text Colors**: `#ffffff` (주요 헤드라인), `#e5e5e5` (본문), `#a3a3a3` (보조 설명)
  - **Brand Accent 1 (Affiliate Amber)**: `#f59e0b` (쇼핑제휴 수익, 강조, 전환 CTA)
  - **Brand Accent 2 (Platform Royal Blue)**: `#3b82f6` (플랫폼 연동, 링크 생성, 탭 강조)
  - **Brand Accent 3 (Publish Emerald)**: `#10b981` (발행 완료, 정상 상태)

---

## 3. 구현 범위 및 상세 계획

### 1) 레이아웃 & 사이드바 (`Sidebar.tsx`, `layout.tsx`)
- 모바일 상단 고정 헤더 신설: 로고, 타이틀, 버전 배지(`v1.61`), 모바일 햄버거 메뉴 토글 버튼.
- 모바일 슬라이드 드로어 메뉴: 375px 폭에서 깔끔하게 펼쳐지고 닫히는 반응형 메뉴.
- 사이드바 다크 스타일 일관화 (`#171717` 배경, `#262626` 보더, 화이트 텍스트).
- 메뉴 항목 표준화:
  - `🏠 대시보드` (`/dashboard`)
  - `STEP 1 🔥 트렌드 & 떡상 탐지기` (`/trends`)
  - `STEP 2 🛒 제휴 상품 관리` (`/products`)
  - `STEP 3 📝 게시글 관리` (`/posts`)
  - `📖 연동 & 사용 매뉴얼` (`/guide`) - 표준 명칭 적용
  - `🔑 API키등록·플랫폼연동` (`/settings`)
- 사용자 이메일 표시 및 로그아웃 버튼 다크 테마 일관화.

### 2) 비주얼 사용 매뉴얼 (`/guide/page.tsx`) 신규 구축
- **캐릭터 말풍선 안내**: "🤖 쇼핑제휴 AI 어시스턴트: 상품 URL 또는 검색 하나로 제휴 링크 추출, 떡상 AI 카피라이팅, 카드뉴스 조립, 예약 발행까지 한 번에 완료하세요!"
- **4단계 핵심 워크플로우 비주얼 다이어그램**:
  - STEP 1 🔑 플랫폼 & AI 연동 (Threads OAuth, OpenAI/Gemini/Claude, 쿠팡/알리/토스 API)
  - STEP 2 🛒 제휴 상품 수집 & 등록 (키워드 검색 및 URL 등록, 고화질 썸네일 & 제휴 URL 자동 생성)
  - STEP 3 🔥 떡상 탐지 & AI 페르소나 (Threads 실시간 트렌드 탐색, 10종 바이럴 페르소나 적용)
  - STEP 4 ⚡ AI 캡션·카드뉴스 조립 & 즉시/예약 발행 (공정위 경제적 대가 고지 자동 포함, 예약 스케줄링)
- **4대 제휴 플랫폼 연동 비교 가이드 테이블**:
  - 쿠팡 파트너스 (API 키 발급 조건 및 직링크 붙여넣기 팁)
  - 알리익스프레스 어필리에이트 (Affiliate API 및 추적 ID 연동)
  - 네이버 브랜드커넥트 (링크 복사 연동)
  - 토스쇼핑 쉐어링크 (쉐어링크 파트너 연동 및 고정 IP 설정)
- **공정위 심사 지침 필수 준수 가이드**:
  - 추천·보증 등에 관한 표시·광고 심사지침 준수를 위한 "쿠팡 파트너스 활동의 일환으로 수수료를 제공받습니다" 문구 자동 부착 원리 안내.
- **자주 묻는 질문 (FAQ) 아코디언 카드**:
  - Q1: 쿠팡 API 키가 아직 없어도 사용할 수 있나요? (네, 직접 발급 링크 붙여넣기로 즉시 사용 가능)
  - Q2: Threads 계정은 몇 개까지 연결할 수 있나요?
  - Q3: 이미지 생성 시 비용이 발생하나요? (본인 등록 Google Gemini API 키 기준 무료/유료 할당량 적용)
  - Q4: 예약 발행은 백그라운드에서 자동으로 진행되나요?

### 3) 대시보드 (`/dashboard/page.tsx`) 다크 테마 정돈
- 다크 캔버스 배경 및 통계 카드 스타일 통일 (`bg-[#1f1f1f] border-neutral-800`).
- 상단 프로그램 소개 및 5단계 가이드 카드 다크 앰버/블루 칩으로 업그레이드.
- 다가오는 예약 게시 리스트 다크 테두리 및 텍스트 시인성 확보.

### 4) 인수인계 및 규격화 산출물 구축
- `threads-affiliate-poster/docs/DESIGN_HANDOFF.md` 작성
- `threads-affiliate-poster/docs/IMPROVEMENTS.md` 작성 (3대 개선과제 + 타 프로그램 탐색 개선안)
- `threads-affiliate-poster/docs/IMPROVEMENT_BACKLOG.md` 작성
- `threads-affiliate-poster/AGENTS.md` 및 `README.md` 7대 핵심 항목 완벽 갱신
- 루트 `DESIGN.md` 44번 `✅ 1차 작업완료 (v1.61, 스레드 바이럴 스튜디오 스타일 — 쇼핑제휴 변형)` 갱신
- 루트 `docs/ACTIVE_WORK.md` 내 줄 삭제 및 `docs/HANDOFF.md` 최신 작업 내역 등록

---

## 4. 검수 계획
1. **로컬 빌드 검증**: `cd threads-affiliate-poster && npm run build` (타입/컴파일 오류 0건).
2. **프로덕션 배포 및 DB 동기화**:
   - `update programs set version = 'v1.61', updated_at = now() where slug = 'threads-affiliate-poster';`
   - `vercel deploy --prod --yes`
3. **Microsoft Edge 포그라운드 실세션 검수**:
   - `headless: false` 설정으로 Edge 브라우저 실행.
   - 일반 회원 테스트 계정(`buylifemall@naver.com`) 세션 주입.
   - 데스크톱(1440×900) 및 모바일(375×812) 뷰 캡처 및 화면 레이아웃 정상 동작 확인:
     - 대시보드 (`/dashboard`)
     - 연동 & 사용 매뉴얼 (`/guide`)
     - 모바일 헤더 및 햄버거 메뉴 열림 상태
4. **비용**: 테스트 비용 0원 (유료 API 호출 금지 원칙 준수).
