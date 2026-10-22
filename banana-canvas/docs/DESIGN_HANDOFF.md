# AI 바나나 캔버스 자동화 (banana-canvas) — 디자인 개발완료 보고서 (DESIGN_HANDOFF)

## ★ 현재 적용: v1.20 「나노바나나 크림 팝 스타일 (Nano Banana Cream Pop Style)」 — 2026-10-22 Claude Code(윈도우)
> 공식 템플릿: **DESIGN.md 카탈로그 11번(독립 템플릿)**. 플랜: `docs/PLAN_20261022_DESIGN_RENEWAL.md`. 아래 v1.08 기록(바나나 팝 차콜 변형)은 이전 버전 이력으로 보존.

| 토큰 | 값 | 용도 |
|---|---|---|
| `--background` | `#fff8d6` | 모든 페이지 바탕(연한 바나나 크림) + 옅은 반점 도트 무늬 |
| `--card` / `--card2` / `--stage` | `#fffdf3` / `#fff3b8` / `#fffbe8` | 카드 / 안쪽 칸·칩 / 결과 무대 |
| `--foreground` = `--brand-ink` | `#2b2410` | 본문 글자·먹선 테두리·노란 바탕 위 글자 |
| `--brand` / `--brand-deep` | `#ffd43b` / `#f2b705` | 실행 버튼·활성 칩·선택 메뉴 / 눌림·포커스 |
| `--brand-text` | `#7a5200` | 크림 바탕 위 노랑 계열 글자(노란 글씨 금지) |
| `--leaf` / `--leaf-soft` / `--leaf-ink` | `#2f8a3b` / `#dff3d6` / `#1b4f22` | 성공·제안 버튼·안내 |
| `--line` / `--line-strong` | `#ecd27a` / `#c9a63a` | 카드 테두리 / 입력칸·버튼 테두리 |
| `--muted` | `#5f5028` | 보조 글자 |
| `--pop` | `2px 2px 0 #2b2410` | 스티커 팝 그림자 |

- **시그니처**: 카드 위 바나나 껍질 띠(`.bc-card::before`, 노랑→진한 바나나→연두 4px), 18px 둥근 카드, 알약 버튼, 주요 버튼 2px 먹선 + 팝 그림자(호버 시 살짝 뜨고 누르면 눌림), 선택된 칩·메뉴는 바나나 노랑 + 먹선, 브랜드 아이콘·마스코트는 크림 바탕 + 먹선(🍌가 묻히지 않게).
- **가독성 기준**: 본문 15px·줄간격 1.65, 안내·라벨·버튼 13px, 작은 글자 12px. 대비(계산값): 본문 14.4, 보조 7.4, 노랑 계열 글자 6.8, 노란 버튼 글자 10.8, 잎 안내 8.2(모두 4.5:1 이상). 초록 버튼 흰 글자는 `#2f8a3b`에서 4.4 → `#256f2f`로 보정(코드 반영, **다음 배포 때 나감**).
- **구조**: `globals.css` = 맨 위 토큰 + 골격 CSS(흰색 기본) + 「v1.20 덮어쓰기」 블록 + 「6-1 가독성 보정」. 기능 컴포넌트는 그대로. 화면 파일 직접 색은 `--brand-text`/`--danger` 토큰만 사용.
- **모바일**: 767px 이하 위쪽 메뉴(☰), 560px 이하 `.bc-btns` 한 열(「사진에서 요리명 제안」 꺾임 해결). 390px 틀 검수: 가로 넘침 0, 잘린 칸 0.
- **주의**: 노란 바탕 위에 노란 글씨(`var(--brand)` 글자색)를 쓰지 말 것 → `--brand-text`. 잠긴 카드는 흐림 0.72 + 꺼진 버튼 0.85(겹쳐도 읽힘).
- **남은 것**: 로그인 화면이 공식 탭 레이아웃(DESIGN.md 원칙 14)과 다름(색은 새 템플릿 적용됨) — 별도 작업.

---

## (이전 버전 기록) v1.08

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
