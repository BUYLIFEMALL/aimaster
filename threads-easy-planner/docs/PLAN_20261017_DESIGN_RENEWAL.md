# Threads AI 기획 자동화 (threads-easy-planner) v1.45 디자인 리뉴얼 및 시스템 규격화 개발 플랜

> **작성 일자**: 2026-10-17  
> **수행 에이전트**: Antigravity (윈도우 PC, `agy`)  
> **대상 프로그램**: 32번 Threads AI 기획 자동화 (`threads-easy-planner`)  
> **배포 주소**: https://threads-easy-planner.buylife.xyz  
> **목표 버전**: `v1.44` ➔ `v1.45`  

---

## 1. 개요 및 목적
- **목적**: 32번 `Threads AI 기획 자동화`의 UI/UX 디자인을 메타 스레드 공식 감성의 **"스레드 바이럴 스튜디오 스타일 — 기획기 변형"**으로 정식 리뉴얼하고, 사이드바 명칭 통일, 모바일 반응형 최적화, 비주얼 사용 매뉴얼(`/guide`) 강화, 인수인계 문서 체계화를 완료하여 공식 **「✅ 1차 작업완료」** 상태로 전환합니다.
- **배경**: 현재 프로그램은 주제 추천, 럭키 픽, 페르소나 원클릭 글 생성, 5대 첫 문장 훅, 4단계 본문, 자댓글 CTA, 7종 다시 쓰기, 사진/영상 5컷 정밀 분석 등 기능적 완성도가 높으나, 공식 디자인 현황판(`DESIGN.md`)에서 여전히 「⚪ 작업 예정」으로 분류되어 있고, 프로그램 폴더 내 규격화된 인수인계 문서(`DESIGN_HANDOFF.md`, `IMPROVEMENTS.md`)가 누락되어 있습니다.

---

## 2. 디자인 템플릿 및 비주얼 컨셉

### 1) 스타일 템플릿 고유 명칭
- **명칭**: **스레드 바이럴 스튜디오 스타일 — 기획기 변형 (Threads Viral Studio Style - Planner Variant)**
- **기존 레퍼런스**: 30번 `threads-content-ops` (Threads 콘텐츠 운영 자동화)의 클린 화이트/모노톤 감성을 계승

### 2) 컬러 토큰 및 디자인 톤앤매너
- **메인 배경**: 퓨어 화이트 (`#ffffff`) & 소프트 슬레이트 서피스 (`#f8fafc` / `#f1f5f9`)
- **브랜드 베이스**: Meta Threads 모노 블랙 (`#171717`) & 딥 다크 (`#0f0f0f`)
- **포인트 액센트**:
  - 바이럴 파이어 앰버 (`#f59e0b`): 럭키 픽, 훅 강조, 핵심 칩
  - 일렉트릭 바이올렛 (`#8b5cf6`): 페르소나 버튼, AI 분석 뱃지
  - 에메랄드 그린 (`#10b981`): 저장 완료, 복사 성공, 초간편판 칩
- **선정 이유**: 사용자가 실제로 Meta Threads 모바일 앱을 보듯이 군더더기 없는 미니멀 모노톤을 유지하되, 초보자가 스크롤을 내리며 버튼 하나로 글을 완성할 수 있도록 핵심 버튼과 훅에 감각적인 포인트를 주어 가독성과 클릭 집중도를 극대화합니다.

---

## 3. 세부 작업 범위 및 구현 순서

### Step 1. 사이드바 및 모바일 반응형 정리
- **`Sidebar.tsx`**:
  - 프로그램 공식 명칭을 `Threads AI 기획기`에서 **`Threads AI 기획 자동화`**로 통일
  - 버전 표기: `v1.45` 갱신
  - 메뉴 아이콘 및 텍스트 시각적 계층화 (스레드 기획기 ➔ 내 콘텐츠 보관함 ➔ API키 관리 ➔ 사용 매뉴얼)
- **`MobileNavigation.tsx`**:
  - 767px 이하 스마트폰 화면에서 상단 고정 헤더와 하단 탭바 레이아웃 터치 영역(최소 44px 이상) 보장
  - 모바일에서도 매뉴얼(`/guide`) 접근이 직관적으로 연결되도록 보강

### Step 2. 메인 기획 스튜디오 (`PlannerApp.tsx`) UI/UX 다듬기
- 소재 입력창, 럭키 픽 칩, 미디어(사진/영상 5컷 분석) 업로드 영역 테두리와 그림자 정돈
- 5대 훅 문장(자책형·부정명령형·썰형·논쟁형·반전형) 비교 탭의 시각적 명도 대비 강화
- 7종 원클릭 다시 쓰기 버튼 및 보관함 저장/복사 토스트 애니메이션 자연스럽게 개선

### Step 3. 비주얼 사용 매뉴얼 (`/guide`) 고도화
- 4단계 핵심 파이프라인 (글감 선택 ➔ 원클릭 생성 ➔ 5대 훅 적용 ➔ 자동보관·CTA) 다이어그램 정돈
- 실전 훅 작성 비법 및 자댓글 유도 팁 카드 시각화
- 트러블슈팅 FAQ 아코디언 및 API 키 발급 가이드 팝업 연결

### Step 4. 로컬 빌드 및 타입 검증
- Next.js 프로덕션 빌드 (`npm run build`)
- TypeScript 타입 에러 0건 검증

### Step 5. 프로덕션 배포 및 DB 동기화
- `src/lib/version.ts`: `v1.45` 갱신
- Supabase DB: `update programs set version = 'v1.45', updated_at = now() where slug = 'threads-easy-planner';`
- Vercel 프로덕션 배포 (`vercel deploy --prod --yes`)

### Step 6. 브라우저 실세션 검수 (Microsoft Edge 전용)
- `msedge` 포그라운드(화면 노출 `headless: false`) 실행
- 데스크톱 (1440px) 및 모바일 (375px) 화면 대조 검수 스크린샷 캡처 및 확인

### Step 7. 인수인계 문서 작성 및 저장소 동기화
- `threads-easy-planner/docs/DESIGN_HANDOFF.md` 작성
- `threads-easy-planner/docs/IMPROVEMENTS.md` 작성
- `threads-easy-planner/docs/IMPROVEMENT_BACKLOG.md` 작성
- `threads-easy-planner/AGENTS.md` 및 `README.md` 7대 핵심 항목 정리
- `DESIGN.md` 32번 「✅ 1차 작업완료 (`v1.45`, 스레드 바이럴 스튜디오 스타일)」 갱신 및 `ACTIVE_WORK.md` 작업 중 행 정리

---

## 4. 비용 및 리스크 점검
- **비용**: **0원** (로컬 빌드, Vercel 배포, 유료 API 호출 없음)
- **리스크**: 기존 잘 동작하는 미디어 프로세서(WebCodecs/Canvas), AI 생성 액션 로직을 전혀 훼손하지 않는 Surgical Changes 원칙 준수
