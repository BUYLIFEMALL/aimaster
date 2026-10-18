# AI 바나나 캔버스 자동화 (banana-canvas) — UI/UX 디자인 개발완료 보고서 (DESIGN_HANDOFF)

> **작업 일시**: 2026-10-18  
> **담당 에이전트**: Antigravity (윈도우)  
> **적용 버전**: `v1.08`  
> **공식 디자인 템플릿 명칭**: **크리에이티브 아틀리에 스타일 — 바나나 팝 차콜 변형 (Creative Atelier Style — Banana Pop Charcoal Edition)**  
> **공식 서비스 URL**: https://banana-canvas.buylife.xyz  
> **검수 브라우저**: Microsoft Edge (포그라운드 실세션 검수, 일반 회원 테스트 계정 `buylifemall@naver.com`)

---

## 1. 디자인 리뉴얼 개요 및 목적
- **목적**: 기존 화이트/남색 기본 뼈대 UI를 탈피하고, 같은 뼈대의 이미지 프로그램(`portrait-photo` v1.22, `four-cut-comics` v1.12)에서 성공적으로 검증된 **「맨 위 색 토큰 + 맨 끝 덮어쓰기 CSS」** 방식을 적용하여, 바나나 옐로와 잎사귀 그린이 돋보이는 따뜻하고 감각적인 **크리에이티브 아틀리에 스타일 — 바나나 팝 차콜 변형**으로 전면 리뉴얼함.
- **주요 해결 과제**:
  1. 페이지 배경을 따뜻한 차콜(`#16140f`)과 딥 차콜 서피스(`#201d16`), 바나나 옐로(`#ffd84d`) 포인트로 일체화하여 눈의 피로를 덜고 결과 이미지의 몰입감을 극대화함.
  2. 스튜디오 대시보드 상단에 **빠른 작업 지도 칩 띠 (`.bc-nav-chips`)**를 구축하여 8개 작업 카드로의 즉각적인 스크롤 이동 지원.
  3. 좌측 사이드바 🍌 브랜드 아이콘 테마화 및 **`📖 연동 & 사용 매뉴얼` (`/guide`) 메뉴명 표준화** (`DESIGN.md` 9번 원칙 충족).
  4. 비주얼 가이드북(`/guide`) 히어로 배너, 3단계 워크플로우 카드, 20종 스타일 칩 고도화.
  5. 375px 모바일 뷰포트에서 상단 56px 슬림 헤더, 가로 넘침(0px 방어) 및 터치 사용성 확보.

---

## 2. 디자인 시스템 및 컴포넌트 명세

### 1) 컬러 팔레트 (Color Palette)
- **Background**:
  - Main Body: `#16140f` (Warm Deep Charcoal)
  - Card Surface: `#201d16` (Deep Charcoal Surface with Soft Warm Shadow)
  - Nested Surface / Dropzone: `#2a261d` (Sub Card Surface)
  - Stage Canvas: `#1a1711` (Preview & Modal Stage)
- **Primary / Brand**:
  - Banana Yellow: `#ffd84d` (메인 CTA 액션 버튼, 활성 뱃지, 잉크 텍스트 `#1d1806`)
  - Leaf Green: `#7ed38a` (성공 배지, 부가 하이라이트, 잉크 `#0d2612`)
  - Accent Orange: `#ff8a5c` (레시피, 팁, 주의)
- **Border & Line**:
  - Soft Brown Line: `#3a3427` (종이/아틀리에 경계선)
  - Strong Line: `#4f4736` (포커스 및 호버 테두리)
- **Text**:
  - Primary Text: `#f3efe4` (따뜻한 오프 화이트)
  - Muted Text: `#a8a08c` (캡션 및 플레이스홀더)

### 2) 핵심 컴포넌트 리뉴얼 내역
- **사이드바 (Banana Atelier Sidebar)**:
  - 데스크톱: 좌측 244px 고정 패널, 🍌 브랜드 아이콘 배지, 3단계 작업 흐름 링크, `v1.08` 배지, 회원 계정 정보 위젯.
  - 모바일(375px): 상단 56px 슬림 헤더(🍌 로고 + 프로그램명 + 버전 배지 + ☰ 햄버거 버튼), 탭 오버레이 메뉴.
  - 메뉴명: `📖 연동 & 사용 매뉴얼` (`/guide`) 표준화 완료.
- **3열 올인원 스튜디오 대시보드 (`/studio`)**:
  - 상단 작업 지도 칩 띠 (`.bc-nav-chips`): 🖼️ 원본, ✨ 생성, ⚡ 빠른 작업, 🎞️ 스토리, 🛠️ 편집, 🧩 합성, 📖 인생 앨범, 💬 만화 패널, 🌟 결과 보기.
  - 1열: 원본 이미지 업로드 및 드롭존, AI 이미지 생성, 빠른 원클릭 도구 4종, 연속 스토리/레시피 카드.
  - 2열: 정밀 편집(20종 스타일 드롭다운), 5장 멀티 합성, 인생 앨범, 만화 패널.
  - 3열: 화면 고정 결과 카드, 고해상도 프리뷰, 확대경 모달, "이 결과로 계속 편집".
- **비주얼 가이드북 (`/guide`)**:
  - 바나나 마스코트 히어로 배너 (`.gd-hero`, `.gd-mascot`, `.gd-bubble`).
  - 3단계 워크플로우 카드 (`.gd-flow`): 1. 원본 준비 ➔ 2. 도구 실행 ➔ 3. 결과 다운로드 & 계속 편집.
  - 20종 스타일 프리셋 시각화 칩 수록.
  - Gemini API 키 연동 보안 및 FAQ 6종 아코디언.
- **기타 화면**:
  - 내 결과 기록 (`/history`), API 키 설정 (`/settings`), 로그인 (`/login`) 화면 바나나 팝 차콜 테마 100% 일체화.

---

## 3. Microsoft Edge 포그라운드 실세션 검수 결과

> **검수 환경**: Windows 11 Microsoft Edge (버전 최신, `headless: false`, 10분간 화면 유지)  
> **테스트 계정**: `buylifemall@naver.com` (일반 회원 테스트 계정)

| 검수 대상 화면 | 경로 | 검수 내용 및 결과 | 상태 |
| :--- | :--- | :--- | :---: |
| **데스크톱 스튜디오 대시보드** | `/studio` | 따뜻한 차콜 배경, 상단 작업 지도 칩 띠, 3열 카드 배치, 바나나 옐로 버튼 정상 노출 | ✅ 완벽 |
| **데스크톱 비주얼 가이드북** | `/guide` | 바나나 히어로 배너, 3단계 워크플로우, 20종 스타일 칩, FAQ 아코디언 완벽 렌더링 | ✅ 완벽 |
| **데스크톱 API 키 설정** | `/settings` | Gemini 본인 키 설정 콘솔, 팝업 매뉴얼 버튼, 마스킹 키 정상 | ✅ 완벽 |
| **데스크톱 결과 기록** | `/history` | 최근 30건 카드 그리드, 즐겨찾기, 팝 차콜 테마 일체화 | ✅ 완벽 |
| **모바일 375px 대시보드** | `/studio` | 56px 상단 슬림 헤더, 가로 넘침(0px 방어), 작업 칩 가로 감싸기 최적화 | ✅ 완벽 |
| **모바일 375px 햄버거 메뉴** | `/studio` | ☰ 버튼 터치 시 부드러운 드로어 메뉴 전개, `/guide` 포함 전 메뉴 접근성 우수 | ✅ 완벽 |
| **모바일 375px 비주얼 가이드** | `/guide` | 1열 반응형 카드 재배치, 바나나 배지 및 터치 아코디언 완벽 동작 | ✅ 완벽 |

### 검수 스크린샷 아티팩트
1. [데스크톱 스튜디오 대시보드](file:///C:/Users/Administrator/.gemini/antigravity-cli/brain/3a7fab5b-023b-4b09-81e4-11e7ec517fc9/edge_banana_canvas_desktop_studio_v108.png)
2. [데스크톱 비주얼 가이드북](file:///C:/Users/Administrator/.gemini/antigravity-cli/brain/3a7fab5b-023b-4b09-81e4-11e7ec517fc9/edge_banana_canvas_desktop_guide_v108.png)
3. [데스크톱 API 키 설정](file:///C:/Users/Administrator/.gemini/antigravity-cli/brain/3a7fab5b-023b-4b09-81e4-11e7ec517fc9/edge_banana_canvas_desktop_settings_v108.png)
4. [데스크톱 결과 기록](file:///C:/Users/Administrator/.gemini/antigravity-cli/brain/3a7fab5b-023b-4b09-81e4-11e7ec517fc9/edge_banana_canvas_desktop_history_v108.png)
5. [모바일 375px 스튜디오 대시보드](file:///C:/Users/Administrator/.gemini/antigravity-cli/brain/3a7fab5b-023b-4b09-81e4-11e7ec517fc9/edge_banana_canvas_mobile_studio_v108.png)
6. [모바일 375px 햄버거 메뉴 열림](file:///C:/Users/Administrator/.gemini/antigravity-cli/brain/3a7fab5b-023b-4b09-81e4-11e7ec517fc9/edge_banana_canvas_mobile_menu_v108.png)
7. [모바일 375px 비주얼 가이드북](file:///C:/Users/Administrator/.gemini/antigravity-cli/brain/3a7fab5b-023b-4b09-81e4-11e7ec517fc9/edge_banana_canvas_mobile_guide_v108.png)

---

## 4. 인수인계 특이사항 및 다음 CLI 가이드
1. **공용 모듈 사본 주의**:
   - `src/lib/geminiImage.ts` 및 `nanoBananaModels.ts`는 공용 기준 코드 사본이므로 단독 수정하지 마십시오.
2. **배포 정보**:
   - Vercel Deployment ID: `dpl_9DPewHntU69SMr9xv9T67XRJu47s`
   - Scope: `--scope buylife`
   - Production URL: https://banana-canvas.buylife.xyz
