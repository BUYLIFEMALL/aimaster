# 📋 [플랜] 31번 쇼츠 떡상 분석·대본 자동화 (shorts-viral-studio) 디자인 리뉴얼 및 비주얼 가이드북 구축

> **작성일**: 2026-10-18  
> **작성자**: Antigravity CLI (agy, 윈도우)  
> **프로그램**: 쇼츠 떡상 분석·대본 자동화 (`shorts-viral-studio`, https://shorts-viral-studio.buylife.xyz)  
> **버전 계획**: `v1.10` → `v1.11`  
> **적용 템플릿**: **플로우 위저드 스타일 (다크 차콜 변형)**

---

## 1. 배경 및 목적
1. **AIMaster 통합 디자인 표준 준수**:
   - `DESIGN.md` 및 `docs/PROGRAM_DESIGN_STANDARD.md`의 카탈로그 31번 공식 권장 스타일인 **플로우 위저드 스타일 (다크 차콜)** 을 모든 페이지에 일관되게 적용합니다.
   - 현재 기존 라이트 테마(흰색/그레이)에서 쇼츠 영상 제작 및 유튜브 콘솔 환경에 최적화된 고급스러운 딥 차콜 다크 테마로 전환합니다.
2. **모바일(375px) 사용성 혁신**:
   - 상단 56px 고정 헤더(로고, 앱 이름, 버전 배지, 햄버거 토글 버튼) 및 슬라이드 오버레이 드로어 메뉴를 구축하여 모바일에서도 1~6단계 위저드와 유틸리티를 원터치로 쾌적하게 조작할 수 있도록 개선합니다.
3. **비주얼 사용 매뉴얼 (`/guide`) 신설**:
   - 사이드바 유틸리티 영역에 `📖 연동 & 사용 매뉴얼` 메뉴를 표준 배치하고, 유튜브 데이터 수집부터 11대 바이럴 메커니즘 분석, 대본/프롬프트 생성까지 알기 쉽게 설명하는 종합 비주얼 가이드북 페이지를 신설합니다.
4. **브라우저 실세션 검수 및 인수인계 완결**:
   - Microsoft Edge 포그라운드(`headless: false`) 실세션 검수를 통해 데스크톱/모바일 5종 스크린샷을 검증하고 규격화된 인수인계 문서 6종을 완비합니다.

---

## 2. 작업 범위 및 세부 구현 계획

### Step 1. 글로벌 테마 및 스타일 토큰 전면 정비 (`globals.css`, `ui.tsx`, `layout.tsx`)
- **다크 차콜 컬러 시스템**:
  - 배경: `bg-[#0d1117]` (딥 차콜 나이트)
  - 서피스 카드: `bg-[#161b22]` (차콜 서피스), 보더 `border-[#30363d]`
  - 시그니처 액센트: 쇼츠 레드/로즈 (`bg-rose-600`, `hover:bg-rose-700`, 텍스트 `text-rose-400`, 배지 `bg-rose-500/10 text-rose-400 border-rose-500/20`)
  - 텍스트 가독성: 헤딩 `text-[#f0f6fc]`, 본문 `text-[#c9d1d9]`, 보조/캡션 `text-[#8b949e]`
  - 입력 필드 및 버튼: `bg-[#0d1117]`, `border-[#30363d]`, `text-[#f0f6fc]`, 포커스 링 `ring-rose-500`

### Step 2. 사이드바 및 반응형 셸 고도화 (`Sidebar.tsx`, `DashboardShell.tsx`, `layout.tsx`)
- **사이드바 메뉴 표준화**:
  - 대시보드 (`/`)
  - 1~6단계 플로우 스텝퍼 (01 쇼츠 검색 → 02 바이럴 분석 → 03 소재 발굴 → 04 주제 확정 → 05 대본 생성 → 06 프롬프트)
  - 유틸리티 메뉴: `📚 프롬프트 보관함` (`/vault`), `🔑 API키등록·플랫폼연동` (`/settings`), `📖 연동 & 사용 매뉴얼` (`/guide`)
  - 하단 사용자 계정 카드 및 로그아웃 버튼 다크 스타일링
- **모바일 햄버거 헤더 & 슬라이드 오버레이 드로어 구축**:
  - 모바일 전용 56px 상단 고정 헤더 (`h-14`, `sticky top-0 z-40 bg-[#161b22]/95 backdrop-blur border-b border-[#30363d]`)
  - 햄버거 버튼 클릭 시 화면 전체를 덮는 딤 오버레이 및 좌측 슬라이드 드로어 메뉴 작동

### Step 3. 비주얼 사용 매뉴얼 (`src/app/(dashboard)/guide/page.tsx`) 신설
- **히어로 배너**: 쇼츠 떡상 분석·대본 자동화 공식 매뉴얼 (`v1.11`) 소개 및 핵심 워크플로우 요약
- **6단계 올인원 제작 파이프라인**:
  - STEP 01: 유튜브 떡상 쇼츠 검색 (키워드/채널, 조회수/구독자 비율 필터)
  - STEP 02: 11대 바이럴 메커니즘 심층 분석 (Gemini 영상 직접 분석 / 메타데이터 추정)
  - STEP 03: 벤치마킹 기반 신규 소재 6종 AI 발굴
  - STEP 04: 타겟 전략 및 사용자 맞춤 주제 확정
  - STEP 05: 씬별 호흡 최적화 대본 및 연출 지시문 생성 (한 문장 규칙)
  - STEP 06: 이미지(미드저니/DALL-E) · 영상(Runway/Luma/Kling) · BGM(Suno) 프롬프트 자동화
- **API 키 연동 가이드**:
  - YouTube Data API v3 (무료 하루 10,000 유닛 할당량, 검색 필수)
  - AI 멀티모델 (Gemini, OpenAI, Claude 중 1종 이상 연동)
- **자주 묻는 질문(FAQ)**: 아코디언 인터랙션 5종

### Step 4. 메인 대시보드 및 단계별 UI 다크 테마 일관 적용
- `HomePanel.tsx`: 프로젝트 목록, 시작 카드, 최근 작업 이어하기 등 다크 차콜 스타일 통일
- `SearchStep.tsx`, `AnalyzeStep.tsx`, `IdeaSteps.tsx`, `ScriptStep.tsx`, `PromptsStep.tsx`, `VaultPanel.tsx`, `GuideLinkButton.tsx`: 서피스/텍스트/보더/버튼/테이블 다크 테마 조화

### Step 5. 버전 판올림 및 로컬 검증
- `src/lib/version.ts`: `v1.11`
- `package.json`: `1.11.0`
- `npm test` 및 `npm run build` 실행하여 무결성 확인
- Supabase DB `programs` 테이블 `v1.11` 갱신

### Step 6. Vercel 프로덕션 배포 및 Microsoft Edge 포그라운드 실세션 검수
- `npx vercel --prod --yes`로 1회 프로덕션 배포
- Microsoft Edge 포그라운드 (`headless: false`) 실행:
  - 데스크톱 (1440px) 대시보드 & 가이드북
  - 모바일 (375px) 대시보드 & 햄버거 드로어 & 가이드북
  - 총 5종 스크린샷 캡처 및 아티팩트 보존

### Step 7. 인수인계 규격화 및 현황판 동기화
- 인수인계 문서 6종 작성 (`PLAN`, `DESIGN_HANDOFF`, `IMPROVEMENTS`, `IMPROVEMENT_BACKLOG`, `AGENTS.md`, `README.md`)
- `DESIGN.md` 31번 `✅ 1차 작업완료` 갱신
- `docs/ACTIVE_WORK.md` 및 `docs/HANDOFF.md` 동기화 후 Git Commit & Push
