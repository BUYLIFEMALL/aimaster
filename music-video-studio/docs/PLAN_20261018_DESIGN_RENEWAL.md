# 뮤직비디오 자동화 (music-video-studio) v1.11 디자인 리뉴얼 사전 개발 플랜

- **작성 일자**: 2026-10-18
- **작업자**: Antigravity CLI (agy, 윈도우)
- **대상 프로그램**: 16번 `뮤직비디오 자동화` (`music-video-studio`)
- **공식 서비스 URL**: https://music-video-studio.buylife.xyz
- **프로그램 구분**: 멀티미디어 카테고리 / AI 가사·스토리보드 기획 & Veo 영상 생성 스튜디오

---

## 1. 개요 및 문제점 분석

### 1.1 현황 및 개선 필요점
1. **디자인 테마 미흡 및 구형 UI**:
   - 현재 일반 라이트 모드(흰색 바탕, 단순 로즈 컬러)로 구성되어 있어, 뮤직비디오 및 음악 미디어 제작 전문 프로그램의 사이버네틱하고 프로페셔널한 감성이 결여됨.
   - `DESIGN.md` 16번 권장 템플릿인 **사이버 네온 다크 콘솔 스타일 (Cyber Neon Dark Console Style)**에 맞추어, 퓨어 딥 블랙(`#060911`)과 네온 사이언(`#22d3ee`) & 퍼플 글로우(`#a855f7`)의 앰프 랙마운트 콘솔 테마로 리뉴얼 필요.
2. **비주얼 가이드북 부재 (DESIGN.md 9번 원칙 위반)**:
   - 현재 `/guide` 페이지가 전혀 존재하지 않으며 사이드바에도 매뉴얼 메뉴가 누락되어 있음.
   - 초보자가 Suno 음악 스타일 프롬프트 작성부터 Gemini 스토리보드 분할, Veo 고화질 영상 프롬프트 렌더링까지 한눈에 이해할 수 있는 비주얼 가이드북 신설 필수.
3. **모바일 반응형(375px) 내비게이션 미흡**:
   - 모바일 환경에서 상단 단순 펼침 토글로 되어 있어, 56px 상단 슬림 헤더 + 슬라이딩 드로어 메뉴(Drawer) 표준으로 전면 개편 필요.
4. **인수인계 문서 6종 부재**:
   - 서브폴더 내 `docs/` 디렉터리가 없으며, `AGENTS.md` 규격화, `docs/DESIGN_HANDOFF.md`, `docs/IMPROVEMENTS.md`, `docs/IMPROVEMENT_BACKLOG.md` 완비 필요.

---

## 2. 작업 목표 및 공식 템플릿 지정

### 2.1 공식 디자인 템플릿 명칭
- **사이버 네온 다크 콘솔 스타일 — 뮤직비디오 앰프 데크 에디션 (Cyber Neon Dark Console Style — Music Video Deck Edition)**

### 2.2 핵심 색상 및 토큰 설계 (단일 테마 원칙)
- **전체 배경**: 퓨어 딥 블랙 (`#060911` / `#080c14`)
- **사이드바 배경**: 다크 랙마운트 콘솔 (`#0a0e1a`)
- **서피스 카드**: 앰프 패널 서피스 (`#0e1424` / `#121a2d`)
- **테두리 & 디바이더**: 콘솔 슬레이트 보더 (`#1e293b` / `#334155`)
- **시그니처 포인트**:
  - 네온 사이언 (`#06b6d4` / `#22d3ee`): 메인 네온 하이라이트, 음악/영상 스펙트럼
  - 일렉트릭 퍼플 글로우 (`#a855f7` / `#c084fc`): 파이프라인 스텝퍼, 액센트 배지
  - 네온 로즈 (`#f43f5e`): 씬 생성 및 미디어 포인트
- **텍스트**: 헤드라인 퓨어 화이트 (`#ffffff`), 본문 슬레이트 200 (`#e2e8f0`), 보조 슬레이트 400 (`#94a3b8`)

---

## 3. 세부 구현 단계 (순차 진행)

### Step 1: 레이아웃 및 375px 모바일 내비게이션 구축
- `src/components/layout/Sidebar.tsx`:
  - 앰프 콘솔 네온 다크 테마 적용.
  - 상단 56px 고정 슬림 헤더 + ☰ 햄버거 버튼 터치 시 슬라이딩 드로어(Drawer) 및 백드롭 오버레이 구축.
  - 가로 넘침(`overflow-x-hidden`) 0px 방어.
  - 메뉴 구성: 1단계 음악·가사(`/music`) ➔ 2단계 스토리보드(`/storyboard`) ➔ 3단계 장면 제작(`/scenes`) ➔ 🔑 API키 설정(`/settings`) + **📖 연동 & 사용 매뉴얼 (`/guide`) 메뉴 신설**.
- `src/app/globals.css` & `src/app/layout.tsx` & `src/app/(dashboard)/layout.tsx`:
  - 전체 배경 `#060911` 및 커스텀 네온 스크롤바 일체화.

### Step 2: 공용 UI 및 핵심 페이지 전면 리뉴얼
- `src/components/studio/ui.tsx`:
  - `Card`, `INPUT`, `SELECT`, `BTN_PRIMARY`, `BTN_GHOST`, `StepHeader`, `ErrorNote`, `NeedStep`을 사이버 네온 다크 콘솔 스타일로 전면 리디자인.
- 각 단계별 페이지 테마 일체화:
  - `/music`: AI 가사 생성기, Suno 스타일 프롬프트 복사 카드, 음원 업로드/주제 설정.
  - `/storyboard`: 장면별 타임코드 분할, 카메라 앵글, 비주얼 프롬프트 매트릭스.
  - `/scenes`: 씬 이미지(Nano Banana) 생성, Veo 영상 렌더링, 예상 비용 안전망 카드.
  - `/settings`: Gemini 본인 API 키 등록 패널 다크 테마 일체화.
  - `/login`: 네온 다크 앰프 콘솔 로그인/회원가입 탭 카드 리뉴얼.

### Step 3: 비주얼 연동 & 사용 매뉴얼 (`/guide`) 전면 신설
- `src/app/(dashboard)/guide/page.tsx` 신설:
  - **공식 가이드북 히어로 배너 (v1.11)**.
  - **4단계 원스톱 뮤직비디오 제작 파이프라인 다이어그램**:
    1. 음악 & 가사 기획 (Suno 프롬프트) ➔ 2. 스토리보드 씬 분할 ➔ 3. AI 씬 이미지 렌더링 ➔ 4. Veo 4K 비디오 생성 & 합성.
  - **Suno 스타일 & 장르 프롬프트 치트시트** (K-Pop, Lo-Fi, Synthwave, Cinematic 등).
  - **Veo 영상 생성 & 비용 최적화 팁 4종**.
  - **트러블슈팅 FAQ 아코디언 5종** (Gemini 본인 키 등록, SSRF 방지, Veo 렌더링 대기 시간, 생성물 로컬 보관 정책 등).

### Step 4: 버전 동기화 및 무결성 검증
- 버전 `v1.11`로 갱신 (`src/lib/version.ts`, `package.json`, Supabase DB `programs.version`).
- `npm test`: 테스트 통과 확인.
- `npx tsc --noEmit`: TypeScript 무오류 확인.
- `npm run build`: Next.js 프로덕션 빌드 성공 확인.

### Step 5: Vercel 프로덕션 배포
- `vercel --scope buylife --prod --yes` 실행.
- 프로덕션 도메인 https://music-video-studio.buylife.xyz 반영 확인.

### Step 6: Microsoft Edge 포그라운드 실세션 검수
- Microsoft Edge 포그라운드(`headless: false`) 실행.
- 일반 회원 테스트 계정(`buylifemall@naver.com`) 로그인 실세션 검수 (데스크톱 3종, 모바일 3종 캡처 아티팩트 보존).

### Step 7: 인수인계 문서 6종 완비 및 루트 동기화
- `music-video-studio/AGENTS.md` (7대 핵심 항목 완벽 규격화)
- `music-video-studio/README.md` (동기화)
- `music-video-studio/docs/DESIGN_HANDOFF.md` (디자인 개발완료 보고서)
- `music-video-studio/docs/IMPROVEMENTS.md` (필수 3대 항목 + 타 프로그램 탐색 제안)
- `music-video-studio/docs/IMPROVEMENT_BACKLOG.md` (작업 대기 백로그)
- `music-video-studio/docs/PLAN_20261018_DESIGN_RENEWAL.md` (사전 개발 플랜 원본)
- 루트 `DESIGN.md` (16번 완료 반영, 누적 49개 완료 달성), `docs/ACTIVE_WORK.md` 행 삭제, `docs/HANDOFF.md` 완료 보고 등록 후 Git 커밋/푸시.
