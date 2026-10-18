# 감성 글귀 이미지 (emotion-writer) — UI/UX 디자인 리뉴얼 개발 플랜

> **작성 일자**: 2026-10-18  
> **작성자**: Antigravity (윈도우)  
> **대상 프로그램**: 19번 `감성 글귀 이미지` (`emotion-writer`, https://emotion-writer.buylife.xyz)  
> **버전 계획**: `v1.14` ➔ `v1.15` (+0.01 갱신)  
> **공식 디자인 템플릿**: **포커스 스튜디오 스타일 — 감성 캘리그라피 에디션 (Focus Studio Style — Emotion Calligraphy Edition)**

---

## 1. 현재 문제점 및 분석 (Analysis)

1. **테마 및 배경색 불일치 / 올드한 스타일**:
   - 현재 차가운 슬레이트 그레이(`#f8fafc`) 배경과 구형 CSS 클래스들이 혼재되어 있어 감성 글귀, 시, 명언 제작 프로그램 특유의 '따뜻한 감성 종이 질감(Paper Texture)' 및 아날로그 캘리그라피의 서정적인 몰입감이 부족함.
2. **사이드바 메뉴 및 가이드북 누락 (`DESIGN.md` 원칙 9번 위반)**:
   - 좌측 사이드바에 필수 유틸리티인 **`📖 연동 & 사용 매뉴얼` (`/guide`) 메뉴가 누락**되어 있으며, 가이드 페이지 자체가 부재함.
3. **모바일(375px) 헤더 및 드로어 편의성 개선 필요**:
   - 모바일 헤더 높이가 불규칙하고(`top-[45px]`), 375px 스마트폰 뷰포트에서 터치 영역 및 드로어 인터랙션이 현대적인 슬림 규격(56px)에 미치지 못함.
4. **API 키 설정 콘솔 및 로그인 화면의 톤앤매너 분리**:
   - 키 설정 카드 및 로그인 페이지가 메인 스튜디오와 감성 톤앤매너가 달라 통일된 사용자 경험을 저해함.

---

## 2. 디자인 리뉴얼 목표 및 템플릿 컨셉

- **공식 템플릿 명칭**: **포커스 스튜디오 스타일 — 감성 캘리그라피 에디션 (Focus Studio Style — Emotion Calligraphy Edition)**
- **컬러 팔레트 및 서피스**:
  - **Background**: 소프트 크림 / 웜 페이퍼 화이트 (`#fdfbf7`, `#fbf8f1`)
  - **Surface & Cards**: 퓨어 페이퍼 화이트 (`#ffffff`), 섬세한 웜 스톤 테두리 (`border-stone-200/80`), 부드러운 종이 그림자 (`shadow-sm`, `shadow-stone-200/40`)
  - **Primary & Accents**: 감성 딥 로즈 & 코랄 (`#e11d48`, `#be123c`), 캘리그라피 잉크 차콜 (`#1c1917`), 따뜻한 앰버 골드 (`#d97706`)
  - **Typography**: Pretendard, 고운돋움, 나눔명조, 나눔손글씨 펜 등 문학적 감성의 타이포그래피 최적화
- **핵심 UI 개선 사항**:
  - **좌측 사이드바**: 웜 크림 톤 정돈, 6단계 파이프라인 스텝퍼 시각화, **`📖 연동 & 사용 매뉴얼` (`/guide`) 신설**, 375px 모바일 56px 슬림 헤더 + 슬라이딩 드로어.
  - **메인 캔버스 뷰포트**: 실시간 감성 글귀 캘리그라피 캔버스(`QuoteCanvas`) 중심 스플릿 뷰 배치, 9:16 인스타 릴스/1:1 피드/4:5 감성 프레임 즉시 프리뷰.
  - **비주얼 연동 매뉴얼 (`/guide`)**: 5단계 감성 글귀 카드뉴스 제작 파이프라인, 서체별 감성 가이드, Unsplash/나노바나나 고화질 배경 활용법, 폰트/레이아웃 꿀팁, FAQ 5종 아코디언.

---

## 3. 상세 구현 계획 및 파일 수정 목록

1. **버전 동기화 (+0.01)**:
   - `src/lib/version.ts` ➔ `v1.15`
   - `package.json` ➔ `1.15.0`
   - Supabase DB `programs.version` ➔ `v1.15`
2. **글로벌 테마 및 레이아웃**:
   - `src/app/globals.css`: 웜 크림 `#fdfbf7` 배경, 포커스 스튜디오 페이퍼 카드 토큰 적용.
   - `src/app/layout.tsx` & `src/app/(studio)/layout.tsx`: 웜 크림 배경 일체화.
3. **네비게이션 및 컴포넌트**:
   - `src/components/Sidebar.tsx`:
     - 56px 모바일 슬림 헤더 및 슬라이딩 드로어 구축.
     - `📖 연동 & 사용 매뉴얼` (`/guide`) 메뉴 링크 신설.
     - 6단계 워크플로우 칩 웜스톤/로즈 감성 디자인으로 일체화.
   - `src/components/Workspace.tsx`: 6단계 글귀 제작 워크스페이스(주제 선택, 이미지 소스, 화면비율, 줄 수, 글귀 생성, 완성 저장) 웜 페이퍼 테마 리뉴얼.
   - `src/components/KeySettings.tsx` & `src/app/(studio)/settings/page.tsx`: 웜 크림 포커스 스튜디오 감성으로 API 키 관리 콘솔 리뉴얼.
   - `src/components/LoginForm.tsx` & `src/app/login/page.tsx`: 표준 2-Tab 로그인/회원가입 레이아웃을 웜 크림 감성 캘리그라피 테마로 일체화.
4. **비주얼 연동 & 사용 매뉴얼 신설 (`src/app/(studio)/guide/page.tsx`)**:
   - 히어로 비주얼 배너 (`v1.15`).
   - 5단계 감성 글귀 카드뉴스 제작 파이프라인 비주얼 다이어그램.
   - 명언/위로/인생지혜 주제별 추천 서체 & 배경 매칭 가이드.
   - Unsplash 무료 감성 사진 vs Gemini 나노바나나 AI 이미지 활용 팁.
   - 100% 로컬 프라이버시 캔버스 렌더링 안내 & FAQ 5종 아코디언.

---

## 4. 검수 계획 및 완료 기준

1. **로컬 무결성 검증**:
   - `npm test` 통과 확인
   - `npx tsc --noEmit` 무오류 확인
   - `npm run build` Turbopack 빌드 성공 확인
2. **Vercel 프로덕션 배포**:
   - `vercel --scope buylife --prod --yes` 실행 ➔ https://emotion-writer.buylife.xyz
3. **Microsoft Edge 포그라운드 실세션 검수 (`headless: false`)**:
   - 일반 회원 테스트 계정(`buylifemall@naver.com`) 로그인 실세션 검수.
   - 데스크톱(1440px) 4개 화면 + 모바일(375px) 3개 화면 스크린샷 수집 및 아티팩트 보존.
4. **인수인계 문서 6종 완비 및 루트 동기화**:
   - `AGENTS.md` (7대 핵심 항목 완벽 규격화), `README.md`, `DESIGN_HANDOFF.md`, `IMPROVEMENTS.md`, `IMPROVEMENT_BACKLOG.md`, `PLAN_20261018_DESIGN_RENEWAL.md`.
   - `DESIGN.md` (누적 50개 완료 달성 반영), `ACTIVE_WORK.md`, `HANDOFF.md` 동기화 및 Git Commit/Push.
