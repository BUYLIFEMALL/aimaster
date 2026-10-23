# 🚀 [개발 플랜] 23번 이미지 스타일 분석기 (`style-dna-analyzer`) 디자인 템플릿 리뉴얼 및 고도화

> **프로그램명**: 이미지 스타일 분석기 (Style DNA Analyzer)  
> **공식 URL**: https://style-dna-analyzer.buylife.xyz  
> **적용 버전**: `v1.22` (기존 `v1.21`에서 판올림)  
> **적용 디자인 템플릿**: **크리에이티브 아틀리에 스타일 — 스타일 DNA 랩 에디션 (Creative Atelier Style — Style DNA Lab Edition)**  
> **기준 일시**: 2026-10-19  
> **작업 담당**: Antigravity CLI (agy)  
> **원칙 준수**: 단일 작업 순차 진행 원칙, karpathy 4원칙, 회원 본인 API 키 원칙, Edge 포그라운드 실세션 검수 의무

---

## 1. 현황 및 해결할 문제 (Problem Statement)
1. **단조로운 라이트 테마 탈피 및 바이오 랩 아틀리에 무드 구축**:
   - 현재 밝은 배경(`bg-gray-50/60`, `#ffffff`) 일변도로 구성되어 있어, 이미지 스타일 DNA 분석 및 시퀀싱 실험실의 하이테크 감성이 부족함.
   - 딥 미드나잇 다크 네이비(`bg-[#0c0f17]`) 배경과 서피스 카드(`bg-[#131824]`), 보더(`border-[#222d42]`), 시안 블루(`text-cyan-400` / `#06b6d4` — DNA 바이오 랩 포인트) 및 일렉트릭 바이올렛(`text-violet-400` / `#8b5cf6` — AI 신경망 포인트)을 적용하여 감각적인 스타일 DNA 랩 아틀리에로 전면 전환.
2. **사이드바 메뉴 표준화 및 `/guide` 독립 매뉴얼 페이지 신설 (`DESIGN.md` 9번 원칙)**:
   - 현재 사이드바에 보관함, 1·2·3단계 스텝, 설정만 있고 `📖 연동 & 사용 매뉴얼` 메뉴가 누락되어 있음.
   - 사이드바에 **`📖 연동 & 사용 매뉴얼` (`/guide`)**을 신설하고, 독립된 `src/app/(dashboard)/guide/page.tsx` 페이지를 구축하여 단계별 가이드, DNA 복제 vs 변이(0~100%) 공식, 화면비 자동감지, FAQ 5종 아코디언 제공.
3. **기존 핵심 분석 및 생성 로직 100% 무결성 보존**:
   - 카메라 앵글, 조명, 색상 팔레트(Sharp 기반 5색 추출), 렌더링 스타일, 마스터 프롬프트 생성(국문/영문), 미세 보정(Refine), 결과 테스트(Test 이미지 생성 및 일치율 비교), 보관함(Record 관리) 로직 완벽 유지.
4. **버전 및 DB 메타데이터 일치 동기화**:
   - `package.json`, `src/lib/version.ts`, Supabase DB `programs.version`을 모두 **`v1.22` (`1.22.0`)**으로 통일.

---

## 2. 세부 구현 단계 (Implementation Steps)

### 1단계: 버전 판올림 (`1.22.0` / `v1.22`) 및 Supabase DB 동기화
- `package.json`: `1.22.0`
- `src/lib/version.ts`: `v1.22`
- Supabase DB: `programs` 테이블에서 `slug: 'style-dna-analyzer'`의 `version`을 `v1.22`로 업데이트.

### 2단계: 다크 아틀리에 테마 CSS 토큰 시스템 구축 (`globals.css`, `layout.tsx`)
- 다크 캔버스 배경: `#0c0f17`
- 서피스 카드: `#131824`, 서피스 호버: `#182030`, 보더: `#222d42`
- 헤드라인/본문 텍스트: `#f8fafc` / `#cbd5e1`
- 포인트: 시안 블루 (`#06b6d4`), 바이올렛 (`#8b5cf6`), 에메랄드 (`#10b981`)
- 글로벌 CSS 토큰 및 덮어쓰기 적용.

### 3단계: 사이드바 네비게이션 리뉴얼 및 `/guide` 메뉴 신설 (`Sidebar.tsx`)
- 다크 아틀리에 감성에 맞춘 브랜드 로고 배지 및 시안/바이올렛 액센트 적용.
- 보관함(`/dashboard`), 1단계 분석(`/analyze`), 2단계 보정(`/refine`), 3단계 테스트(`/test`), 설정(`/settings`)과 함께 **`📖 연동 & 사용 매뉴얼` (`/guide`)** 메뉴 신설.

### 4단계: 비주얼 에디토리얼 가이드북 페이지 구축 (`src/app/(dashboard)/guide/page.tsx`)
- `STYLE DNA ANALYZER EDITORIAL GUIDE` 시안/바이올렛 그라디언트 히어로 배너.
- **5단계 핵심 파이프라인 비주얼 카드**:
  1. `STEP 1. 레퍼런스 이미지 업로드 & 비율 자동 감지`: 12종 화면비 및 고해상도 이미지 최적화.
  2. `STEP 2. DNA 시퀀싱 모드 (복제 vs 변이)`: 0-30% Stable, 31-70% Hybrid, 71-100% Chaotic 변이율 조절.
  3. `STEP 3. 5대 스타일 인자 심층 해독`: 카메라·조명·색상 팔레트·질감·렌더링 스타일 추출.
  4. `STEP 4. 마스터 프롬프트 & 첨부 이미지 연동`: Midjourney/Stable Diffusion/Gemini 호환 프롬프트.
  5. `STEP 5. 미세 보정 & 결과 테스트`: 즉석 이미지 생성 및 원본과의 스타일 일치율 시각 비교.
- **자주 묻는 질문 (FAQ 5종 아코디언)**: 소요 시간 및 비용, 얼굴/인물 사진 반영, 돌연변이 모드 활용법, 상업적 이용 등.

### 5단계: 로컬 빌드 및 단위 테스트 검증
- `npm test`: 기존 `tests/dna.test.mjs`, `tests/access.test.mjs` 검증.
- `npx tsc --noEmit`: TypeScript 에러 0건 확인.
- `npm run build`: Next.js Turbopack 빌드 성공 확인.

### 6단계: Vercel 프로덕션 배포 및 도메인 바인딩
- `vercel --prod` 실행 및 `https://style-dna-analyzer.buylife.xyz` 배포 확인.

### 7단계: Microsoft Edge 포그라운드 최전면 실세션 검수
- 일반 회원 테스트 계정(`buylifemall@naver.com`) 세션으로 로그인.
- 브라우저를 화면 최전면(최대화)으로 띄워 10분간 유지하며 6종 화면 캡처 아티팩트 보존.

### 8단계: 인수인계 문서 6종 완비 및 마스터 현황판 동기화 후 Git 푸시
- `AGENTS.md`, `README.md`, `DESIGN_HANDOFF.md`, `IMPROVEMENTS.md`, `IMPROVEMENT_BACKLOG.md` 작성.
- `DESIGN.md`, `docs/ACTIVE_WORK.md`, `docs/HANDOFF.md` 동기화 및 커밋/푸시.
