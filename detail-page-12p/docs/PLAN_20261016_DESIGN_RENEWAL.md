# AI 12단 상세페이지 자동화 — 디자인 리뉴얼 및 비주얼 가이드 신설 개발 플랜

- **작성 일시**: 2026-10-16
- **작업자**: Antigravity CLI (agy, Windows PC)
- **대상 프로그램**: `detail-page-12p` (AI 12단 상세페이지 자동화)
- **라이브 서비스 도메인**: [https://detail-12p.buylife.xyz](https://detail-12p.buylife.xyz)
- **목표 버전**: `v1.03` ➔ `v1.04`
- **지정 템플릿**: **포커스 스튜디오 스타일 (Focus Studio Style · 이커머스 상세페이지 스튜디오)**

---

## 1. 배경 및 작업 목적

1. **최상단 지침 7번 (사용 매뉴얼 신설 의무) 이행**:
   - 현재 `detail-page-12p` 프로그램은 가이드가 단순히 작은 텍스트 모달(`HelpModal.tsx`)로만 제공되어 있어, 초보 판매자가 12단 상세페이지 제작 파이프라인이나 쿠팡/스마트스토어 규격을 한눈에 파악하기 어렵습니다.
   - 좌측 사이드바에 `📖 연동 & 사용 매뉴얼` 메뉴를 추가하고, 5단계 파이프라인(1. API 키 연동 ➔ 2. 제품 스펙·스마트서치 입력 ➔ 3. 쿠팡 12단/네이버 9단 AI 기획 ➔ 4. Nano Banana 씬별 렌더링 ➔ 5. 860px 통상세 이미지 합성 & ZIP 다운로드)과 FAQ를 갖춘 비주얼 인포그래픽 가이드북을 전면 구축합니다.
2. **최상단 지침 11번 (전체 페이지 단일 배경색 및 일관된 테마 스타일 준수 의무) 이행**:
   - 단일 배경색(`bg-[#f8fafc]`, Clean Studio Light Slate)과 화이트 카드(`bg-white border-slate-200`)로 입력 폼, 12단 스튜디오, 보관함, 사용 매뉴얼 전 화면의 시각적 일관성을 확보합니다.
3. **최상단 지침 6번 (사전 분석 플랜 및 개선 인수인계서 작성) 이행**:
   - 작업 착수 전 기능·로직·라우트 심층 분석 문서를 남겨 다른 CLI가 언제든 이어받을 수 있도록 체계화합니다.

---

## 2. 작업 범위 및 세부 구현 내용

### 1) 테마 토큰 및 레이아웃 통일 (포커스 스튜디오 스타일)
- **단일 배경색**: `#f8fafc` (`bg-[#f8fafc]`)
- **사이드바**: `bg-white border-slate-200`
- **카드 및 패널**: `bg-white border-slate-200 rounded-2xl shadow-sm`
- **메인 포인트**: 블루/인디고 그라디언트 `from-blue-600 to-indigo-600` (`#2563eb`, `#4f46e5`)
- **서브 포인트**: 에메랄드 `#10b981` (연동 완료, 쿠팡 로켓 배지), 앰버 `#f59e0b` (키 미등록 알림)
- **입력 필드**: `bg-white border-slate-200 text-slate-900 focus:border-indigo-500`

### 2) 📖 연동 & 사용 매뉴얼 (`/guide` 및 `TabType = "guide"`) 신설
- 사이드바 유틸리티 영역에 `📖 연동 & 사용 매뉴얼` 메뉴 탑재 (블루/인디고 펄스 배지).
- `src/components/DetailGuideView.tsx` 신설:
  - **헤더 배너**: 포커스 스튜디오 배지, 이커머스 상세페이지 제작 가이드북 안내.
  - **5단계 제작 파이프라인 인포그래픽**:
    - STEP 01. 본인 Google Gemini API 키 연동 (플랫폼 가이드 연계)
    - STEP 02. 제품 기본정보 및 1초 스마트 스펙 자동검색
    - STEP 03. 쿠팡 12단 / 네이버 스마트스토어 9단 AI 전체 카피 기획
    - STEP 04. Nano Banana 멀티모달 상업용 씬별 이미지 렌더링
    - STEP 05. 860px 쿠팡 표준 세로 통상세페이지 자동 합성 & 일괄 ZIP 다운로드
  - **12단 씬 구성 표준 치트시트**: 프로모션 헤더, 브랜드 스토리, 핵심 소구점 3단, 특장점 비교표, 사용 방법, 패키지 구성, 구매 혜택, 품질 보증 등 12개 씬의 역할 안내.
  - **이커머스 플랫폼 권장 규격표**: 쿠팡(가로 860px 세로 자유), 스마트스토어(가로 860px 분할 권장) 등 가이드.
  - **자주 묻는 질문 (FAQ) 4종**: 아코디언 인터랙션 지원.
- `src/app/guide/page.tsx` 신설: 직접 URL 진입 지원.

### 3) 기존 뷰 컴포넌트 스타일링 강화
- `Sidebar.tsx`: `📖 연동 & 사용 매뉴얼` 메뉴 추가, 계정 정보 12px 간격 밀착.
- `ProductInputForm.tsx`: 포커스 스튜디오 스타일 카드 일체화 및 입력 가독성 개선.
- `DetailStudioView.tsx`: 스마트폰 라이브 프리뷰어 및 씬 카드 그리드 테마 통일.
- `DetailHistoryView.tsx`: 보관함 프로젝트 카드 및 빈 상태 뷰 테마 통일.

### 4) 버전 판올림 및 배포 동기화
- `APP_VERSION = "v1.04"`
- `package.json` 버전 갱신
- Supabase 공유 DB `programs.version = 'v1.04'` 업데이트
- Next.js Turbopack 로컬 빌드 검증 (`npm run build`)
- Vercel 프로덕션 배포 (`https://detail-12p.buylife.xyz`)

---

## 3. 검수 방법 (Microsoft Edge 전용)
- **검수 브라우저**: `msedge.exe` (Microsoft Edge 전용)
- **테스트 계정**: `buylifemall@naver.com` (일반 회원 세션 로그인)
- **검수 항목**:
  1. 데스크톱(1440px): `/guide` 5단계 파이프라인, 12단 치트시트, FAQ, `/` 1단계 입력, 2단계 스튜디오, 3단계 보관함 화면 단일 배경색(`#f8fafc`) 일체감 확인
  2. 모바일 반응형(390px): 모바일 헤더, 햄버거 메뉴, 가이드북 모바일 뷰 터치 타깃 점검
  3. 아티팩트 스크린샷 저장 및 시각적 검증

---

## 4. 예상 비용 및 인수인계 산출물
- **비용**: 0원 (UI/UX 프론트엔드 개편, 유료 API 호출 없음)
- **인수인계 산출물**:
  - `docs/PLAN_20261016_DESIGN_RENEWAL.md` (본 문서)
  - `docs/IMPROVEMENTS.md` (개선사항 원장)
  - `docs/IMPROVEMENT_HANDOFF_20261016.md` (개선사항 인수인계서)
  - `docs/DESIGN_HANDOFF.md` (디자인 완료 보고서)
  - 루트 `DESIGN.md` 상태 갱신
  - 루트 `docs/HANDOFF.md` 최신 작업 기록
