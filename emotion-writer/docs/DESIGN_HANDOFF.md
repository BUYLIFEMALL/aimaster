# 감성 글귀 이미지 (emotion-writer) — UI/UX 디자인 개발완료 보고서 (DESIGN_HANDOFF)

> **작업 일시**: 2026-10-18  
> **담당 에이전트**: Antigravity (윈도우)  
> **적용 버전**: `v1.15`  
> **공식 디자인 템플릿 명칭**: **포커스 스튜디오 스타일 — 감성 캘리그라피 에디션 (Focus Studio Style — Emotion Calligraphy Edition)**  
> **공식 서비스 URL**: https://emotion-writer.buylife.xyz  
> **검수 브라우저**: Microsoft Edge (포그라운드 실세션 검수, 일반 회원 테스트 계정 `buylifemall@naver.com`)

---

## 1. 디자인 리뉴얼 개요 및 목적
- **목적**: 기존의 다소 건조하거나 페이지별 톤이 나뉘어 있던 화면을 벗어나, 따뜻한 종이 질감의 캔버스 위에서 손글씨와 감성 문장을 조화롭게 빚어내는 **포커스 스튜디오 스타일 — 감성 캘리그라피 에디션**으로 전면 리뉴얼함.
- **주요 해결 과제**:
  1. 페이지 배경을 소프트 크림/웜 페이퍼 화이트(`#fdfbf7`, `#fbf8f1`)와 퓨어 페이퍼 카드(`#ffffff`)로 일체화하여 눈의 피로를 덜고 아늑한 감성 작업 환경 구현.
  2. 375px 모바일 뷰포트에서 상단 56px 슬림 웜 크림 헤더 + 슬라이딩 드로어 메뉴를 구축하여 가로 넘침(0px 방어) 없는 반응형 사용성 확보.
  3. 좌측 사이드바에 **`📖 연동 & 사용 매뉴얼` (`/guide`) 메뉴 신설** 및 단계별 비주얼 가이드북 구축 (`DESIGN.md` 9번 원칙 충족).
  4. 2-Tab 표준 로그인 화면(`src/app/login/page.tsx`)을 웜 크림 감성 캘리그라피 테마로 리뉴얼하여 첫 진입 경험 개선.
  5. 브라우저 온디바이스 Canvas 기반 100% 로컬 프라이버시 원칙 및 Google Imagen/Nano Banana 본인 API 키 연동 안내 투명화.

---

## 2. 디자인 시스템 및 컴포넌트 명세

### 1) 컬러 팔레트 (Color Palette)
- **Background**:
  - Main Body: `#fdfbf7` (Soft Warm Cream Paper)
  - Layout & Section: `#fbf8f1` ~ `#f5efe6` (Warm Parchment)
  - Card & Surface: `#ffffff` (Pure Paper Surface with Soft Warm Shadow)
- **Primary / Brand**:
  - Deep Rose & Coral Accent: `#be185d` / `#e11d48` / `#f43f5e` (감성 액션 버튼, 활성 탭 하이라이트)
  - Warm Amber & Gold: `#d97706` / `#b45309` (배지, 팁 콜아웃)
  - Soft Ink Black / Slate: `#1e293b` / `#334155` (가독성 높은 텍스트)
- **Border & Line**:
  - Warm Border: `#e7ded0` / `#d5c7b3` (종이 경계선 질감)
  - Focus Ring: `#fb7185` (로즈 글로우)

### 2) 핵심 컴포넌트 리뉴얼 내역
- **사이드바 (Calligraphy Studio Sidebar)**:
  - 데스크톱: 좌측 256px 고정 웜 크림 패널, 6단계 워크플로우 칩(`1.감성분석` ~ `6.내보내기`), `v1.15 WARM PAPER` 배지, 회원 계정 정보 위젯.
  - 모바일(375px): 상단 56px 슬림 헤더(로고, 버전 배지, 햄버거 버튼), 탭 오버레이 드로어, 닫기 애니메이션.
  - 신규 메뉴: `📖 연동 & 사용 매뉴얼` (`/guide`) 추가.
- **감성 글귀 캔버스 스튜디오 (`/`)**:
  - 좌측 조작 패널: 글귀 입력, 감성 프리셋 선택, Unsplash/Nano Banana 배경 선택, 폰트/스타일 조절.
  - 우측 라이브 캔버스: 1:1, 4:5, 9:16 인스타그램/쇼츠 비율 지원, 실시간 렌더링 및 고해상도 PNG 즉시 다운로드.
- **비주얼 가이드북 (`/guide`)**:
  - 히어로 배너 (포커스 스튜디오 감성 에디션 소개 및 웜 그라디언트 오라).
  - 5단계 감성 파이프라인 카드 (감성 분석 ➔ 문구 정제 ➔ 배경 합성 ➔ 캘리그라피 ➔ 인스타/쇼츠 발행).
  - 서체 매칭 팁 (나눔손글씨, 마루부리, Pretendard 활용법).
  - Unsplash 무료 이미지 vs Nano Banana AI 생성 배경 선택 가이드.
  - 100% 온디바이스 로컬 Canvas 렌더링 보안 안내.
  - 초보 창작자 자주 묻는 질문(FAQ) 5종 아코디언.
- **2-Tab 표준 로그인 화면 (`/login`)**:
  - 소프트 웜 크림 배경 + 화이트 페이퍼 카드.
  - [로그인] / [회원가입] 2-Tab 전환 구조, 소셜 및 이메일 로그인 지원.

---

## 3. Microsoft Edge 포그라운드 실세션 검수 결과

> **검수 환경**: Windows 11 Microsoft Edge (버전 최신, `headless: false`, 10분간 화면 유지)  
> **테스트 계정**: `buylifemall@naver.com` (일반 회원 테스트 계정)

| 검수 대상 화면 | 경로 | 검수 항목 및 결과 | 상태 |
| :--- | :--- | :--- | :---: |
| **데스크톱 스튜디오 홈** | `/` | 웜 크림 배경, 좌측 조작부 + 우측 캔버스 분할, 6단계 워크플로우 칩 정상 노출 | ✅ 완벽 |
| **데스크톱 가이드북** | `/guide` | 히어로 배너, 5단계 파이프라인 카드, 폰트 매칭 팁, FAQ 5종 완벽 렌더링 | ✅ 완벽 |
| **데스크톱 API 설정** | `/settings` | Google Imagen/Nano Banana 본인 키 설정, 키 저장 및 상태 배지 정상 | ✅ 완벽 |
| **모바일 375px 스튜디오** | `/` | 56px 상단 슬림 헤더, 가로 넘침(Overflow 0px) 방어, 캔버스 최적 스케일링 | ✅ 완벽 |
| **모바일 375px 드로어** | `/` | 햄버거 클릭 시 부드러운 드로어 열림, `/guide` 포함 전 메뉴 접근성 확보 | ✅ 완벽 |
| **모바일 375px 가이드북** | `/guide` | 1열 반응형 카드 재배치, 폰트 팁 및 FAQ 터치 인터랙션 완벽 동작 | ✅ 완벽 |

### 검수 스크린샷 아티팩트
1. [데스크톱 스튜디오 홈](file:///C:/Users/Administrator/.gemini/antigravity-cli/brain/3a7fab5b-023b-4b09-81e4-11e7ec517fc9/edge_emotion_writer_desktop_studio_v115.png)
2. [데스크톱 비주얼 가이드북](file:///C:/Users/Administrator/.gemini/antigravity-cli/brain/3a7fab5b-023b-4b09-81e4-11e7ec517fc9/edge_emotion_writer_desktop_guide_v115.png)
3. [데스크톱 API 키 설정](file:///C:/Users/Administrator/.gemini/antigravity-cli/brain/3a7fab5b-023b-4b09-81e4-11e7ec517fc9/edge_emotion_writer_desktop_settings_v115.png)
4. [모바일 375px 스튜디오 홈](file:///C:/Users/Administrator/.gemini/antigravity-cli/brain/3a7fab5b-023b-4b09-81e4-11e7ec517fc9/edge_emotion_writer_mobile_studio_v115.png)
5. [모바일 375px 슬라이딩 드로어](file:///C:/Users/Administrator/.gemini/antigravity-cli/brain/3a7fab5b-023b-4b09-81e4-11e7ec517fc9/edge_emotion_writer_mobile_drawer_v115.png)
6. [모바일 375px 가이드북](file:///C:/Users/Administrator/.gemini/antigravity-cli/brain/3a7fab5b-023b-4b09-81e4-11e7ec517fc9/edge_emotion_writer_mobile_guide_v115.png)

---

## 4. 인수인계 특이사항 및 다음 CLI 가이드
1. **공용 모듈 사본 보존**:
   - `src/lib/studio/geminiImage.ts` 및 `nanoBananaModels.ts`는 기준 코드 사본이므로 단독 수정하지 마십시오.
2. **로컬 Canvas 렌더링**:
   - 모든 캘리그라피 글귀 합성은 브라우저 내부 Canvas API로 처리되어 서버 렌더링 부하 및 개인정보 유출 위험이 없습니다.
3. **배포 정보**:
   - Vercel Deployment ID: `dpl_5T95hAjGAit5E1WEJuYCUjufhqVB`
   - Scope: `--scope buylife`
   - Production URL: https://emotion-writer.buylife.xyz
