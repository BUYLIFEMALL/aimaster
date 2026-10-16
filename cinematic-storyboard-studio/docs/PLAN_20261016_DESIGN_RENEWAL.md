# 시네마틱 스토리보드 자동화 (`cinematic-storyboard-studio`) — 디자인 리뉴얼 개발 플랜

> **작성 일자**: 2026-10-16  
> **작성 에이전트**: Antigravity CLI (`agy`)  
> **대상 프로그램**: `cinematic-storyboard-studio` (시네마틱 스토리보드 자동화, `v1.05` → `v1.06`)  
> **공식 라이브 URL**: `https://cinematic-storyboard-studio.buylife.xyz`  
> **상태**: 📋 개발 플랜 수립 및 승인 대기

---

## 1. 프로그램 심층 분석

### 1) 핵심 가치 및 동작 구조
- **개념**: 레퍼런스 이미지 1장으로 영화·광고·숏폼·뮤직비디오용 **9컷 시네마틱 스토리보드 마스터 시트**와 **Runway Gen-3, Luma Dream Machine, Kling, Sora, Veo용 영상 프롬프트**를 자동 완성하는 전문 AI 디렉터 스튜디오.
- **파이프라인 4단계**:
  1. **이미지 업로드 및 주제 설정**: 이미지 긴 변 1600px 브라우저 최적화 압축, 로그라인(주제) 작성 또는 AI 원클릭 제안.
  2. **장면 및 시각 연출 심층 분석**: Google Gemini 2.5 Flash를 통해 구도·조명·피사체·4단계 감정선 및 9개 키프레임 JSON 분석.
  3. **9컷 마스터 콘택트 시트 렌더링**: 3:2 비율의 고해상도 9분할 시트 생성 (각 컷별 `KF#01 | 2s | ELS` 메타 자막 합성), 3×3 슬라이더 크롭 인터랙티브 에디터 및 개별 JPG ZIP 다운로드.
  4. **비디오 생성 AI 프롬프트 도출**: 마스터 프롬프트, 장면 9개 프롬프트, JSON 규격 추출 (5초/8초/10초/15초 시간 배분 및 대사 모드).

### 2) 현재 문제점 및 개선 과제
1. **화면 디자인 불일치 및 구형 라이트 모드**:
   - `src/app/(dashboard)/layout.tsx`와 사이드바, 스튜디오, 프로젝트, 설정 화면이 구형 `bg-gray-50/60`, `bg-white border-neutral-200` 라이트 모드로 구성되어 있어 시네마틱 영화 스튜디오 특유의 몰입감이 부족함.
   - 가이드북(`/guide`) 또한 단순 텍스트 줄글 목록으로 구성되어 있어 직관적 이해가 어려움.
2. **사이드바 메뉴 표준화 미비**:
   - 사이드바 유틸리티 영역에 `📖 연동 & 사용 매뉴얼` 대신 옛 `사용 안내` 텍스트로 하단에 배치되어 있음.
3. **최상단 디자인 지침 11번(단일 배경색 및 일관된 테마 준수 의무) 준수 필요**:
   - 전체 화면을 **딥 시네마틱 차콜(`bg-[#0b0f17]`)** 단일 배경색과 통일된 디자인 템플릿(크리에이티브 아틀리에 스타일)으로 일관되게 리뉴얼해야 함.

---

## 2. 디자인 리뉴얼 방향: ✨ 크리에이티브 아틀리에 스타일 (시네마틱 아틀리에)

- **공식 템플릿 명칭**: `✨ 크리에이티브 아틀리에 스타일 (시네마틱 아틀리에)` (Creative Atelier - Cinematic Style)
- **콘셉트**:
  - 프리미어 영화 제작사 및 헐리우드 프리프로덕션 룸 감성의 고급스러운 딥 다크 무드.
  - 딥 시네마틱 차콜(`#0b0f17`, `#111622`)을 메인 바탕으로 사용하고, 영화 필름 골드(`#f59e0b`, 앰버 골드)와 클래퍼보드 레드(`#ef4444`)를 핵심 포인트로 배치.
- **주요 색상 토큰 (Color Tokens)**:
  - **Background**: `#0b0f17` (Deep Cinematic Charcoal) - 전 화면 일관 적용
  - **Sidebar Surface**: `#0e131f` (Atelier Director Aside)
  - **Card / Surface**: `#131926` (Film Deck Card)
  - **Input / Form Surface**: `#182030` (Dark Charcoal Input)
  - **Primary Cinema Accent**: `bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold shadow-[0_0_15px_rgba(245,158,11,0.35)]`
  - **Border**: `#1e293b` (border-slate-800) / Active Border: `border-amber-500/50`
  - **Text**: `#ffffff` (Headings), `#f1f5f9` (text-slate-100 body), `#94a3b8` (text-slate-400 muted)

---

## 3. 세부 구현 계획

### 1단계: 레이아웃 및 사이드바 전면 다크 리뉴얼
- `src/app/(dashboard)/layout.tsx`: `bg-gray-50/60` ➔ `bg-[#0b0f17] font-sans text-slate-100` 교체.
- `src/components/layout/Sidebar.tsx`:
  - `bg-[#0e131f] border-slate-800` 다크 아틀리에 적용.
  - 유틸리티 최상단에 `📖 연동 & 사용 매뉴얼` (`/guide`) 메뉴를 앰버 골드 뱃지 및 하이라이트로 탑재.
  - 번호 배지, 활성 메뉴, 계정 블록 12px 밀착 정렬.

### 2단계: 비주얼 가이드북(`/guide`) 전면 신설 (메인 지침 제7항 이행)
- `src/app/(dashboard)/guide/page.tsx` 전면 재구축:
  1. **헤더**: `🎬 시네마틱 스토리보드 마스터 가이드북` 알약 뱃지, 스튜디오 복귀 버튼.
  2. **5단계 시네마틱 파이프라인 인포그래픽**:
     - STEP 01: 레퍼런스 비주얼 셀렉션 (분위기/장르 원화 업로드)
     - STEP 02: AI 시네마틱 연출 및 9컷 기획 (구도/조명/카메라 워크)
     - STEP 03: 9컷 마스터 콘택트 시트 렌더링 (자막 일체형)
     - STEP 04: 인터랙티브 3×3 자르기 & 무손실 ZIP 다운로드
     - STEP 05: 비디오 AI(Runway, Kling, Sora) 원클릭 프롬프트 복사
  3. **Google Gemini 무료 API 키 연동 안내 카드**: 최상위 절대 규칙 준수 안내 및 1분 발급 3단계 가이드.
  4. **시네마틱 촬영 용어 & 앵글 무빙 치트시트**: ELS, CU, Low Angle, Pan, Tilt, Dolly 등 인터랙티브 용어 맵.
  5. **비디오 생성 AI (Runway Gen-3, Kling, Luma) 실전 연동 팁**: 시작 이미지 활용법 및 프롬프트 주입 노하우.
  6. **자주 묻는 질문(FAQ) 아코디언 4종**: 생성 비용, 9컷 비율, 상업적 이용권, 렌더링 실패 시 대처법.

### 3단계: 스튜디오 및 서브 화면 다크 통일 (메인 지침 제11항 이행)
- `src/components/studio/StudioWorkspace.tsx`:
  - 업로드 드래그앤드롭 박스, 엔진 선택 탭, 분석 9컷 카드 그리드, 비디오 프롬프트 생성기 다크화.
- `src/components/studio/SplitEditor.tsx`:
  - 캔버스 뷰어, 3×3 슬라이더 컨트롤러, 컷별 미리보기 다크화.
- `src/components/studio/ProjectsList.tsx`:
  - 프로젝트 카드 목록 및 빈 상태 뷰 다크 아틀리에 스타일링.
- `src/components/settings/ApiKeySettings.tsx`:
  - API 키 등록 카드 및 연동 가이드 다크화.

### 4단계: 버전 동기화, 빌드 및 배포
- 버전 `v1.05` ➔ `v1.06` 판올림 (`src/lib/version.ts`, `package.json`, Supabase DB `programs.version`).
- Next.js 로컬 빌드 검증 (`npm run build`).
- Vercel 프로덕션 배포 (`vercel deploy --prod`).

### 5단계: Microsoft Edge 전용 실세션 브라우저 검수
- Microsoft Edge (`msedge.exe`)를 통해 일반 회원 테스트 계정(`buylifemall@naver.com`)으로 `/studio`, `/projects`, `/settings`, `/guide` 화면을 실세션 캡처 및 대조 검수.

---

## 4. 인수인계 산출물 목록
1. `docs/PLAN_20261016_DESIGN_RENEWAL.md`: 본 개발 플랜 문서
2. `docs/IMPROVEMENTS.md`: 프로그램 개선사항 및 버그 제안 목록
3. `docs/IMPROVEMENT_HANDOFF_20261016.md`: 개선사항 인수인계서
4. `docs/DESIGN_HANDOFF.md`: 디자인 리뉴얼 완료 인수인계서
5. 루트 `docs/HANDOFF.md` 및 `DESIGN.md` 상태 최신화
