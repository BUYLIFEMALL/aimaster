# 뮤직비디오 자동화 (music-video-studio) — UI/UX 디자인 개발완료 보고서 (DESIGN_HANDOFF)

> **작업 일시**: 2026-10-18  
> **담당 에이전트**: Antigravity (윈도우)  
> **적용 버전**: `v1.11`  
> **공식 디자인 템플릿 명칭**: **사이버 네온 다크 콘솔 스타일 — 뮤직비디오 앰프 데크 에디션 (Cyber Neon Dark Console Style — Music Video Deck Edition)**  
> **공식 서비스 URL**: https://music-video-studio.buylife.xyz  
> **검수 브라우저**: Microsoft Edge (포그라운드 실세션 검수, 일반 회원 테스트 계정 `buylifemall@naver.com`)

---

## 1. 디자인 리뉴얼 개요 및 목적
- **목적**: 기존의 불완전한 라이트/다크 혼합 UI를 탈피하고, 신디사이저·오디오 앰프 랙을 조작하는 듯한 몰입감 높은 **사이버 네온 다크 콘솔 스타일**로 전면 리뉴얼하여 음악/비디오 창작자에게 최적화된 전문 프로덕션 환경을 제공함.
- **주요 해결 과제**:
  1. 페이지별로 불일치하던 배경색을 퓨어 딥 블랙(`#060911`) 및 다크 네이비(`#0a0f1d`)로 통일.
  2. 모바일(375px) 뷰포트에서 상단 56px 슬림 네온 헤더 + 슬라이딩 드로어 메뉴 구축으로 쾌적한 반응형 사용성 확보.
  3. 초보 창작자도 즉시 따라 할 수 있는 **비주얼 연동 & 사용 매뉴얼 (`/guide`)** 신설.
  4. 본인 Gemini API 키 연동 및 Veo 과금 예상 비용 안내의 투명성 강화.

---

## 2. 디자인 시스템 및 컴포넌트 명세

### 1) 컬러 팔레트 (Color Palette)
- **Background**:
  - Main Body: `#060911` (Pure Deep Space Black)
  - Card & Console: `#0a0f1d` ~ `#070b14` (Dark Glassmorphism with Slate/Cyan Border)
  - Sub Surface: `#05070f` (Ultra Deep Black)
- **Primary / Brand**:
  - Neon Cyan: `#00f2fe` / `#22d3ee` (랙 마운트 라인, 인디케이터, 테두리 글로우)
  - Neon Pink & Magenta: `#f43f5e` / `#ec4899` (메인 CTA 액션, 앰프 노브 하이라이트)
  - Studio Violet: `#8b5cf6` / `#a855f7` (그라디언트 브릿지)
- **Status & Badges**:
  - Success: Emerald (`#10b981`, `bg-emerald-950/40 text-emerald-300`)
  - Warning: Amber (`#f59e0b`, `bg-amber-950/30 text-amber-300`)
  - Error: Rose (`#f43f5e`, `bg-rose-950/40 text-rose-300`)

### 2) 핵심 컴포넌트 리뉴얼 내역
- **사이드바 (Rackmount Pipeline Console)**:
  - 데스크톱: 좌측 256px 고정 앰프 랙 스타일, 3단계 파이프라인 시각화, `v1.11 NEON DECK` 배지, 회원 계정 정보 위젯.
  - 모바일(375px): 상단 56px 슬림 헤더(로고, 버전 배지, 햄버거 버튼), 탭 오버레이 드로어, 닫기 애니메이션.
  - 신규 메뉴: `📖 연동 & 사용 매뉴얼` (`/guide`) 추가.
- **공통 UI (`src/components/studio/ui.tsx`)**:
  - `Card`: 다크 글래스모피즘 + 미세한 시안 테두리 글로우.
  - `INPUT` & `SELECT`: 다크 인풋(`bg-slate-950/80 border-slate-700/60 text-slate-100 focus:border-cyan-400`).
  - `BTN_PRIMARY`: 앰프 파워 버튼 감성의 핑크-로즈 네온 그라디언트 + 호버 글로우.
  - `BTN_GHOST`: 시안-슬레이트 미세 테두리 다크 고스트 버튼.
- **3단계 씬 제작 (`/scenes`)**:
  - Veo 모델 선택 랙, 클립 길이, 종횡비 셀렉터, 심리스 루프 온오프 토글.
  - 사전 예상 API 비용(달러 및 원화) 안내 박스.
  - 씬별 프리뷰 카드 (SCENE 번호 뱃지, 미디어 캔버스, 가사 큐, 비주얼 프롬프트 뷰어).
- **비주얼 가이드북 (`/guide`)**:
  - 히어로 배너 (네온 블러 오라).
  - 4단계 파이프라인 비주얼 카드 (1단계 기획 ~ 4단계 Veo 렌더링).
  - Suno AI 음악 프롬프트 치트시트 & Google Veo 루프 영상 제작 팁.
  - FAQ 5종 아코디언.

---

## 3. Microsoft Edge 포그라운드 실세션 검수 결과

| 구분 | 화면 경로 | 검증 항목 | 결과 | 아티팩트 파일명 |
|---|---|---|---|---|
| 데스크톱 | `/music` | 1단계 음악 기획, 사이드바 네온 랙, 가사 에디터, 인풋 다크 테마 | ✅ 통과 | `edge_music_video_desktop_music_v111.png` |
| 데스크톱 | `/storyboard` | 2단계 스토리보드 분할 뷰, 화풍 선택, 씬 분할 카드 | ✅ 통과 | `edge_music_video_desktop_storyboard_v111.png` |
| 데스크톱 | `/scenes` | 3단계 씬 렌더링 콘솔, Veo 엔진 셀렉터, 씬별 프리뷰 카드 | ✅ 통과 | `edge_music_video_desktop_scenes_v111.png` |
| 데스크톱 | `/guide` | 신설 비주얼 가이드북, 4단계 카드, 치트시트, FAQ 아코디언 | ✅ 통과 | `edge_music_video_desktop_guide_v111.png` |
| 데스크톱 | `/settings` | API 키 설정 콘솔 다크 일체화, 마스킹 키 표시, 연동 매뉴얼 팝업 | ✅ 통과 | `edge_music_video_desktop_settings_v111.png` |
| 모바일 | `/music` | 375px 모바일 뷰, 56px 상단 슬림 네온 헤더, 햄버거 버튼 | ✅ 통과 | `edge_music_video_mobile_music_v111.png` |
| 모바일 | Drawer | 모바일 슬라이딩 드로어 메뉴 오픈, 네온 네비게이션 동작 | ✅ 통과 | `edge_music_video_mobile_drawer_v111.png` |
| 모바일 | `/guide` | 모바일 375px 반응형 가이드북 카드 및 FAQ 터치 인터랙션 | ✅ 통과 | `edge_music_video_mobile_guide_v111.png` |

---

## 4. 인수인계 및 다음 작업자 가이드
- **버전 일치 확인**: `src/lib/version.ts`(`v1.11`), `package.json`(`1.11.0`), Supabase DB `programs.version`(`v1.11`).
- **공용 모듈 사본 주의**: `geminiImage.ts` 및 `nanoBananaModels.ts`는 공용 기준 코드 사본이므로 직접 수정하지 않고, 호출부에서 확장하여 사용합니다.
