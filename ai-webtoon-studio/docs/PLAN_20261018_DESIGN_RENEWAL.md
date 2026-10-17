# AI 웹툰 자동화 (`ai-webtoon-studio`) 디자인 리뉴얼 및 가이드북 구축 플랜

- **프로그램명**: AI 웹툰 자동화 (`ai-webtoon-studio`)
- **서비스 공식 URL**: https://ai-webtoon-automation.buylife.xyz
- **대상 버전**: `v1.13` → `v1.14`
- **지정 템플릿**: **크리에이티브 아틀리에 스타일 (웹툰 스튜디오 다크 변형)**
- **작성일자**: 2026-10-18
- **담당 에이전트**: Antigravity CLI (agy, 윈도우)

---

## 1. 개요 및 배경
- **문제점 분석**:
  1. 현재 밝은 흰색 배경(`bg-white`, `bg-slate-50`, `border-slate-200`) 위주로 구성되어 있어, 고해상도 웹툰 컷 아트워크 및 캔버스 작업 시 눈의 피로도가 높고 스튜디오로서의 몰입감이 부족함.
  2. 비주얼 사용 매뉴얼(`/guide` 또는 탭)이 누락되어 있어, 사용자가 5대 아트 스타일 선택, 캐릭터 시트 일관성 유지 기법, 롱스크롤 이어붙이기 JPG 합성 방법을 직관적으로 파악하기 어려움.
  3. 모바일(375px) 화면에서 상단 고정 헤더와 햄버거 토글 슬라이드 오버레이 드로어가 표준화되어 있지 않음.
- **개선 목표**:
  1. 웹툰 아트워크와 컷 콘티가 가장 선명하게 돋보이는 **크리에이티브 아틀리에 다크 템플릿** (`bg-[#0a0d14]`, 서피스 `#121620`, 딥카드 `#181d2a`, 테두리 `#232b3e`, 인디고/바이올렛 `#6366f1`/`#8b5cf6` & 앰버 `#f59e0b` 포인트) 전면 적용.
  2. 모바일(375px) 전용 56px 고정 헤더 및 슬라이드 오버레이 드로어 메뉴 표준화.
  3. **비주얼 연동 & 사용 매뉴얼 (`📖 연동 & 사용 매뉴얼` 탭)** 완전 신설:
     - 🤖 마스코트 환영 배너
     - 4단계 원스톱 웹툰 제작 파이프라인 (기획·시놉시스 → 캐릭터 일관성 시트 → 시나리오 콘티 → 컷 렌더링 & 롱스크롤 JPG)
     - 5대 아트 스타일 가이드 (K-웹툰 실사풍, 로판/순정, 소년만화, 3D 애니, 사이버펑크)
     - 세로 롱스크롤 690px 해상도 및 캔버스 안전영역 가이드
     - BYOK API 키 가이드 및 FAQ 5종
  4. STEP 1~4 섹션 및 설정 모달, 상단 헤더, 사이드바 전체 다크 서피스 토큰 일체화.

---

## 2. 세부 구현 범위 및 순서

### 1단계: 테마 및 토큰 기본 환경 구축
- `ai-webtoon-studio/src/lib/version.ts`: `APP_VERSION = "v1.14"` 판올림.
- `ai-webtoon-studio/src/app/globals.css`: 다크 테마 변수(`--background: #0a0d14; --foreground: #f8fafc;`) 및 다크 커스텀 스크롤바 적용.
- `ai-webtoon-studio/src/app/layout.tsx`: `body` 클래스 다크 테마 토큰 적용 (`bg-[#0a0d14] text-slate-100 antialiased dark`).

### 2단계: 사이드바 & 상단 헤더 리팩터링
- `ai-webtoon-studio/src/components/Sidebar.tsx`:
  - `ActiveTab` 타입에 `"guide"` 추가 (`concept` | `character` | `script` | `canvas` | `guide`).
  - 크리에이티브 아틀리에 다크 사이드바 (`bg-[#121620] border-r border-[#232b3e] text-slate-200`).
  - 1~4 스텝퍼 배지 및 연결선 다크 토큰 최적화.
  - `📖 연동 & 사용 매뉴얼` 신설 메뉴 배치.
  - 모바일(375px) 슬라이드 오버레이 드로어 지원.
- `ai-webtoon-studio/src/components/Header.tsx`:
  - 다크 서피스(`bg-[#121620] border-b border-[#232b3e]`).
  - 마케팅 슬로건 문구 및 API 연동 상태 배지 다크 가독성 개선.
  - ZIP/JPG 일괄 저장 버튼 노란색 포인트 유지 및 시인성 강화.

### 3단계: 비주얼 사용 매뉴얼 (`GuideSection.tsx`) 신설
- `ai-webtoon-studio/src/components/GuideSection.tsx` 신설:
  - 🤖 마스코트 안내 배너
  - 4단계 원스톱 웹툰 제작 워크플로우 카드
  - 5대 아트 스타일 상세 프리뷰 & 특징 비교
  - 세로 롱스크롤 웹툰 뷰어 및 캔버스 합성 가이드
  - BYOK Gemini API 키 등록 가이드
  - 웹툰 작가를 위한 실전 팁 및 FAQ 5종
- `ai-webtoon-studio/src/components/StudioWorkspace.tsx`:
  - `activeTab === "guide"` 렌더링 연결.
  - 다크 레이아웃(`bg-[#0a0d14]`) 및 푸터 다크화.

### 4단계: STEP 1~4 작업 섹션 다크 테마 일체화
- `ProjectSection.tsx`: 기획/컨셉 카드, 인풋, 아트 스타일 라디오/버튼 다크 서피스 적용.
- `CharacterSection.tsx`: 캐릭터 3인 탭, 턴어라운드 시트 프리뷰 다크화.
- `ScriptEditorSection.tsx`: 컷별 연출·대사 콘티 테이블/카드 다크 토큰 일체화.
- `WebtoonCanvasSection.tsx`: 메인 표지 및 컷 렌더링 카드, 세로 롱스크롤 뷰어 컨테이너 다크화.
- `SettingsModal.tsx`: API 키 설정 모달 다크 팝업 서피스(`bg-[#121620] border-[#232b3e]`).

---

## 3. 검증 및 배포 계획
1. **로컬 빌드 검증**:
   - `npm run build` 실행하여 TypeScript 타입 오류 및 빌드 무결성 100% 통과 확인.
2. **Supabase DB 판올림**:
   - `programs` 테이블에서 `slug = 'ai-webtoon-studio'`의 `version = 'v1.14'` 갱신.
3. **Vercel 프로덕션 배포**:
   - `vercel --prod` 실행 (배포 비용 절감 규칙 준수, 단 1회 빌드 완결).
   - `https://ai-webtoon-automation.buylife.xyz` 최신 연결 확인.
4. **Microsoft Edge 포그라운드 실세션 검수 (`headless: false`)**:
   - 일반 회원 테스트 계정(`buylifemall@naver.com`) 세션 쿠키 주입.
   - 데스크톱(1440px) 및 모바일(375px) 화면에서 대시보드 및 가이드북 실세션 캡처 아티팩트 5종 보존.
5. **인수인계 문서 6종 및 현황판 동기화**:
   - `AGENTS.md`, `README.md`, `DESIGN_HANDOFF.md`, `IMPROVEMENTS.md`, `IMPROVEMENT_BACKLOG.md` 7대 규격 완비.
   - `DESIGN.md` 25번 상태 「✅ 1차 작업완료 (`v1.14`, 크리에이티브 아틀리에 스타일)」 갱신 (**✅ 43개 완료**).
   - `docs/ACTIVE_WORK.md` 내 작업 행 삭제 및 `docs/HANDOFF.md` 최상단 인수인계 등록 후 Git Commit & Push.
