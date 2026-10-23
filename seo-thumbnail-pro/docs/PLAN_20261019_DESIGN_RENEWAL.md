# 🚀 [개발 플랜] 22번 AI 유튜브 썸네일 프로 (`seo-thumbnail-pro`) 디자인 템플릿 리뉴얼 및 고도화

> **프로그램명**: AI 유튜브 썸네일 프로  
> **공식 URL**: https://seo-thumbnail-pro.buylife.xyz  
> **적용 버전**: `v1.10` (기존 `v1.09`에서 판올림)  
> **적용 디자인 템플릿**: **크리에이티브 아틀리에 스타일 — 프로 썸네일 캔버스 변형 (Creative Atelier Style — Pro Thumbnail Canvas Edition)**  
> **기준 일시**: 2026-10-19  
> **작업 담당**: Antigravity CLI (agy)  
> **원칙**: 단일 작업 순차 진행 원칙, karpathy 4원칙, 회원 본인 API 키 원칙, Edge 포그라운드 실세션 검수 의무

---

## 1. 현황 및 해결할 문제 (Problem Statement)
1. **단조로운 슬레이트 라이트 테마 탈피 및 아틀리에 감성 구축**:
   - 현재 밝은 회색(`bg-slate-50`, `#f8fafc`) 일변도로 구성되어 있어, 고화질 16:9 유튜브 썸네일의 시각적 집중도와 전문가용 스튜디오 감성이 부족함.
   - 76번 썸네일 마스터(`thumbnail-master`)에서 검증된 딥 미드나잇 다크 네이비(`bg-[#0c0f17]`) 캔버스와 서피스 카드(`bg-[#131824]`), 보더(`border-[#222d42]`), 유튜브 레드(`text-red-500`) 및 골드 앰버(`text-amber-400`) 포인트를 적용하여 세련된 프로 캔버스 아틀리에로 전면 전환.
2. **사이드바 메뉴 표준화 및 매뉴얼 메뉴 신설 (`DESIGN.md` 9번 원칙)**:
   - 현재 사이드바에 3단계 워크플로우와 API키 버튼만 존재하고 매뉴얼 링크가 누락되어 있음.
   - 사이드바에 **`📖 연동 & 사용 매뉴얼`**을 정식 메뉴/버튼으로 배치하여 누구나 쉽게 사용법과 A/B 전략 공식을 열람할 수 있도록 개선.
3. **가이드 모달(`GuideModal.tsx`)의 에디토리얼 비주얼 가이드북 고도화**:
   - 기존의 단순 텍스트 팝업을 다크 아틀리에 감성의 에디토리얼 비주얼 가이드북으로 전면 리뉴얼.
   - 프로 썸네일 캔버스 히어로 배너, 4단계 워크플로우 카드, 클릭률(CTR) 극대화 공식 3선, 회원 본인 키 발급 안내, FAQ 4종 아코디언 구축.
4. **버전 및 메타데이터 4중 일치 동기화**:
   - `package.json`, `src/lib/version.ts`, 푸터 문구, Supabase DB `programs.version`을 모두 **`v1.10` (`1.10.0`)**으로 일괄 통일.
5. **기존 핵심 로직 100% 무결성 보존**:
   - 대본 입력 기반 A/B 전략 생성, SEO 역분석, 피사체/장르/분위기 설정, Nano Banana 기반 썸네일 이미지 생성 및 피드백 수정 루프, 프로젝트 JSON 백업/복원 로직 완벽 보존.

---

## 2. 세부 구현 단계 (Implementation Steps)

### 1단계: 테마 시스템 및 CSS 토큰 정의 (`globals.css`, `layout.tsx`)
- 다크 캔버스 배경: `#0c0f17`
- 3단 워크플로우 카드 패널: `#131824` / `#182030`
- 테두리: `#222d42`
- 헤드라인/본문 텍스트: `#f8fafc` / `#cbd5e1`
- 포인트: 유튜브 레드 (`#ef4444` / `#dc2626`), 골드 앰버 (`#f59e0b`), 썸네일 바이올렛 (`#8b5cf6`)

### 2단계: 사이드바 네비게이션 표준화 (`Sidebar.tsx`)
- 다크 아틀리에 스타일 UI로 전환 (다크 배경, 앰버/레드 액티브 배지).
- 구분선 아래에 **`📖 연동 & 사용 매뉴얼`** 버튼 신설 (`onOpenGuideModal` 연결).
- 로그인 계정 및 로그아웃 영역 다크 테마 일체화.

### 3단계: 비주얼 에디토리얼 가이드북 전면 리뉴얼 (`GuideModal.tsx`)
- 다크 글래스모피즘 모달 컨테이너 (`bg-[#131824]`, `border-[#222d42]`).
- `PRO THUMBNAIL CANVAS EDITORIAL GUIDE` 히어로 배너.
- **4단계 핵심 파이프라인 비주얼 카드**:
  1. `STEP 1. 대본 분석 & CTR 3대 공식`: 호기심 유발형, 가치/혜택 중심형, 감성 후킹형 A/B 전략 도출.
  2. `STEP 2. 피사체 & 비주얼 연출`: 인물 성별/연령대/표정 및 장르별 시각 프롬프트 설계.
  3. `STEP 3. 16:9 고화질 렌더링`: Nano Banana 2.1 기반 시네마틱 썸네일 렌더링 및 부분 수정 피드백.
  4. `STEP 4. 유튜브 스튜디오 태그 복사`: 500자 최적화 태그 및 고정 댓글 전략 원클릭 복사.
- **자주 묻는 질문 (FAQ 4종 아코디언)**: 렌더링 소요 시간, 얼굴 사진 반영법, 텍스트 삽입 팁, API 키 보안.

### 4단계: 워크스페이스 및 3단 컬럼 다크 아틀리에 스타일링
- `Workspace.tsx`, `StrategyColumn.tsx`, `SettingsColumn.tsx`, `ResultColumn.tsx`, `Header.tsx`, `ApiKeyModal.tsx`의 텍스트/카드/입력창을 다크 테마 토큰과 자연스럽게 연동.
- 16:9 캔버스 뷰어의 명암 대비와 가독성 극대화.
- 푸터 버전 표기를 `v1.10`으로 갱신.

### 5단계: 버전 동기화 및 Supabase DB 갱신
- `package.json`: `1.10.0`
- `src/lib/version.ts`: `v1.10`
- Supabase DB: `programs` 테이블에서 `slug: 'seo-thumbnail-pro'` 행의 `version`을 `v1.10`으로 UPDATE.

---

## 3. 검증 및 배포 계획 (Verification & Deployment)
1. **타입스크립트 검증**: `npx tsc --noEmit` 에러 0건 확인.
2. **로컬 프로덕션 빌드 검증**: `npm run build` Turbopack 빌드 성공 확인.
3. **Vercel 프로덕션 배포**: `vercel --prod` 실행 및 도메인 바인딩 확인 (`https://seo-thumbnail-pro.buylife.xyz`).
4. **Microsoft Edge 포그라운드 최전면 실세션 검수 (headless: false)**:
   - 일반 회원 테스트 계정(`buylifemall@naver.com`) 세션 로그인.
   - 브라우저를 화면 최전면(`--start-maximized`)으로 띄워 10분간 유지하며 주인님 실시간 모니터링 보장.
   - 데스크톱(1440px) 및 모바일(375px) 6종 화면 캡처 아티팩트 보존.

---

## 4. 인수인계 산출물
- `seo-thumbnail-pro/AGENTS.md` (7대 규격 갱신)
- `seo-thumbnail-pro/README.md` (동기화 생성)
- `seo-thumbnail-pro/docs/DESIGN_HANDOFF.md`
- `seo-thumbnail-pro/docs/IMPROVEMENTS.md` (3대 필수 개선 항목 포함)
- `seo-thumbnail-pro/docs/IMPROVEMENT_BACKLOG.md`
- `DESIGN.md`, `docs/ACTIVE_WORK.md`, `docs/HANDOFF.md` 동기화 및 Git 커밋/푸시.
