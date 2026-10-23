# 78번 AI Audio분석 자동화 (ai-audio-analyzer) — 디자인 리뉴얼 인수인계서 (v1.10)

## 1. 개요 및 변경 목적
- **대상 프로그램**: 78번 AI Audio분석 자동화 (`ai-audio-analyzer`)
- **라이브 서비스 도메인**: [https://audio.buylife.xyz](https://audio.buylife.xyz)
- **가이드북 URL**: [https://audio.buylife.xyz/guide](https://audio.buylife.xyz/guide)
- **적용 버전**: `v1.10`
- **테마 컨셉**: **사이버 네온 다크 콘솔 스타일 — 오디오 인텔리전스 랩 에디션 (`Cyber Neon Dark Console Style — Audio Intelligence Lab Edition`)**
- **목적**: 기존 라이트 테마에서 오디오 전문 분석 및 신호 처리(DSP) 환경에 걸맞은 하이엔드 다크 콘솔 UI로 전면 리뉴얼하고, 독립 비주얼 가이드북 및 인터랙티브 FAQ를 신설하여 사용자 경험과 플랫폼 완성도를 비약적으로 향상.

---

## 2. 디자인 시스템 상세 규격

### 2.1 컬러 팔레트 & 디자인 토큰
- 메인 배경: `#060911` (Deep Space Dark)
- 콘솔 카드/서피스: `#0a0e19` / `#0e1526`
- 테두리 및 구분선: `#162035` / `#1a2640`
- 네온 시안 (Primary Glow): `#00f0ff`
- 네온 바이올렛 (Secondary Lab Glow): `#8b5cf6`
- 일렉트릭 블루 (Audio Active): `#38bdf8`
- 에메랄드 그린 (Success/Forensic Clean): `#10b981`
- 앰버 옐로우 (Guide Badge/Upscale Warning): `#f59e0b`

### 2.2 메인 화면 및 주요 컴포넌트 리뉴얼
1. **`.studio-hero` 네온 웰컴 배너**:
   - 상단 헤더 바로 아래 배치되어 현재 엔진 버전(`v1.10 Cyber Neon Audio Intelligence Console`), 멀티모달 기술 스펙, 매뉴얼 바로가기 및 API 키 설정 버튼 제공.
2. **3대 핵심 성능 지표 카드 (`.kpi-card`)**:
   - `듀얼 멀티모달 AI 엔진`: 음성/음악 스마트 3초 자동 감지
   - `화자 분리 & 마크다운 회의록`: 점유율, 액션 아이템, 원클릭 복사
   - `Suno v5 역설계 & 음향 포렌식`: God Tier 프롬프트, 4대 스템, 뻥튀기 감정
3. **사이드바 메뉴 표준화**:
   - 브랜드 타이틀 아래 네온 발광 태그 `v1.10 AUDIO LAB`
   - ENGINE MODE 3종 칩 (스마트 자동 판별 `AI Auto`, 음성 인텔리전스·회의록, 음악 분석·Suno v5)
   - WORKFLOW 1-2-3 넘버링 가이드 (`1. 오디오 파일 등록`, `2. Gemini 멀티모달 분석`, `3. 회의록 & 프롬프트 추출`)
   - GUIDE & SETTINGS: `📖 연동 & 사용 매뉴얼` (`GUIDE` 골드 뱃지), `🔑 API키등록·플랫폼연동`
   - 모바일 햄버거 토글 드로어 완비
4. **독립 비주얼 가이드북 (`/guide`) 신설**:
   - 4단계 오디오 인텔리전스 파이프라인 (Step 1~4)
   - 듀얼 인텔리전스 랩 비교 (음성 랩 vs 음악 랩)
   - 4대 스템 및 음향 포렌식 상세 해설
   - FAQ 5종 네온 아코디언 인터랙션
   - 100% 회원 본인 키 원칙 (BYOK) 및 음원 무저장 보안 안내

---

## 3. 실세션 검증 (Microsoft Edge 최전면 포그라운드)
- **일반 회원 테스트 계정**: `buylifemall@naver.com`
- **검수 브라우저**: Microsoft Edge 최전면 포그라운드 (`--start-maximized`)
- **보존된 6종 아티팩트 캡처**:
  1. `edge_audio_desktop_studio_v110.png` (메인 스튜디오 전경)
  2. `edge_audio_desktop_uploader_v110.png` (엔진 모드 탭 & 다크 업로더)
  3. `edge_audio_desktop_guide_v110.png` (비주얼 가이드북 상단 파이프라인)
  4. `edge_audio_desktop_guide_faq_v110.png` (가이드북 FAQ 아코디언 오픈)
  5. `edge_audio_desktop_settings_v110.png` (API 키 설정 다크 콘솔 모달)
  6. `edge_audio_mobile_guide_v110.png` (모바일 375x812 반응형 가이드북 뷰)
- **10분 화면 유지**: 완료 후 실제 브라우저 창 최전면 10분 유지 완료.
