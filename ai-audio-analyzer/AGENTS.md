# AI Audio분석 자동화 (ai-audio-analyzer) — 인수인계 문서

## 1. 개요
- **프로그램명**: AI Audio분석 자동화 (`ai-audio-analyzer`)
- **라이브 도메인**: [https://audio.buylife.xyz](https://audio.buylife.xyz)
- **버전**: `v1.10` (사이버 네온 다크 콘솔 스타일 — 오디오 인텔리전스 랩 에디션)
- **배포 상태**: Vercel 프로덕션 배포 완료 (`READY`, `https://audio.buylife.xyz`)
- **주요 기능**:
  1. **스마트 자동 판별 (Dual Multimodal AI)**: Gemini 2.5 Flash가 오디오를 청취하여 음성(대화/인터뷰/회의)인지 음악(가요/연주곡/비트)인지 3초 자동 감지.
  2. **음성 인텔리전스 & 회의록 자동화 (Speech Lab)**:
     - 화자 분리 및 발언 점유율 계산/시각화 (Speaker Diarization)
     - 타임라인별 초 단위 전사 기록 (Full Transcription)
     - 화자별 역할, 화법 스타일, 핵심 기여도 심층 프로파일링
     - 핵심 질문(Key Questions) 및 실행 과제(Action Items) 추출
     - 감정 어조, 말의 속도, 휴지기(침묵), 추임새(비언어적 요소) 분석
     - 마크다운 회의록(Meeting Minutes) 및 인터뷰 결과 보고서 즉시 생성 & 원클릭 복사
  3. **음악 분석 & Suno v5 역설계 (Music Lab)**:
     - **Suno AI v5 Reverse Prompt (God Tier)**: 음원의 장르, 분위기, 템포, 편곡을 역설계한 서술형 + 구조화 메타태그 프롬프트 생성 & 원클릭 복사
     - **음향 포렌식 & 위변조 품질 분석**: 고주파 절단면(Cut-off) 감지로 MP3 업스케일링(뻥튀기) 여부 판별, 원본 추정 품질, 편집 연결점 탐지
     - **4대 스템 청각 묘사**: Vocals, Bass, Drums, Others 믹싱/이펙트/음역대 상세 묘사
     - **작곡 및 채보 데이터**: 조성(Key & Scale), 박자, 코드 진행(Chord Progression), 비트 그리드 느낌
     - **시각적 곡 구조 분석**: [Intro] -> [Verse] -> [Chorus] -> [Bridge] -> [Outro] 타임라인
     - **가사 전사 (Lyric Transcription)**: 구조화된 가사 전문 및 원클릭 복사
  4. **인터랙티브 파형 뷰어**: 브라우저 Web Audio API 기반 오디오 파형 피크 추출 및 재생 컨트롤 연동.
  5. **독립 비주얼 가이드북 (`/guide`)**:
     - 4단계 오디오 인텔리전스 파이프라인 시각화 (Step 1~4)
     - 듀얼 인텔리전스 랩 핵심 기능 비교 테이블 (Speech Lab vs Music Lab)
     - 4대 스템 및 음향 포렌식 해설
     - FAQ 5종 네온 아코디언 인터랙션
     - 100% 회원 본인 API 키 원칙 (BYOK) 및 음원 무저장/보안 정책 안내

---

## 2. 디자인 시스템 및 UI/UX (사이버 네온 다크 콘솔 스타일)
- **테마 철학**: 정밀 음향 연구실의 하이엔드 오디오 콘솔 인터페이스
- **컬러 팔레트**:
  - 메인 배경: `#060911` (Deep Space Dark)
  - 콘솔 서피스: `#0a0e19` / `#0e1526` (Console Surface)
  - 테두리/구분선: `#162035` / `#1a2640`
  - 네온 시안: `#00f0ff` (Primary Glow & Accent)
  - 네온 바이올렛: `#8b5cf6` (Secondary Lab Accent)
  - 일렉트릭 블루: `#38bdf8` (Waveform Peak & Analysis Active)
  - 에메랄드 그린: `#10b981` (Success & Forensic Clean)
  - 앰버 옐로우: `#f59e0b` (Guide Badge & Upscale Warning)
- **핵심 컴포넌트**:
  - `.studio-hero`: 네온 발광 헤더 배너 및 빠른 이동 버튼
  - `.kpi-card`: 3대 핵심 성능 지표 카드 (듀얼 멀티모달, 화자 분리 회의록, Suno v5 역설계)
  - 사이드바 브랜드 뱃지: `v1.10 AUDIO LAB` 네온 발광 칩
  - 워크플로우 넘버링: `1. 오디오 등록`, `2. 멀티모달 분석`, `3. 회의록/프롬프트 추출`
  - `/guide` 연동 배너: `📖 연동 & 사용 매뉴얼` 골드 배지 및 모바일 반응형 햄버거 토글 드로어 완비

---

## 3. 핵심 파일 구조
- `src/lib/gemini.ts`: Gemini 2.5 Flash 오디오 멀티모달 분석 엔진 (Base64 inlineData, JSON Schema)
- `src/lib/types.ts`: SpeechAnalysisResult, MusicAnalysisResult 등 전체 타입 정의
- `src/lib/version.ts`: APP_VERSION (`v1.10`), APP_NAME, PROGRAM_SLUG 관리
- `src/app/globals.css`: 사이버 네온 다크 콘솔 디자인 토큰, 캔버스 이펙트, 스크롤바 커스텀
- `src/app/layout.tsx`: `#060911` 다크 테마 글로벌 레이아웃
- `src/app/guide/page.tsx`: 독립 비주얼 가이드북 및 인터랙티브 FAQ 페이지
- `src/components/studio/WaveformCanvas.tsx`: 네온 시안/블루 Web Audio API 오디오 파형 캔버스
- `src/components/studio/AudioUploader.tsx`: 다크 콘솔 드래그앤드롭 업로더 및 3대 모드 탭
- `src/components/studio/SpeechReportView.tsx`: 음성 인텔리전스 대시보드 및 마크다운 회의록 생성기
- `src/components/studio/MusicReportView.tsx`: 음악 분석 대시보드, Suno v5 역설계, 4대 스템, 포렌식
- `src/components/studio/AudioAnalyzerApp.tsx`: `.studio-hero` 배너 및 3대 KPI를 포함한 메인 스튜디오
- `src/components/layout/Sidebar.tsx`: 사이버 네온 다크 콘솔 표준 사이드바
- `src/components/settings/ApiKeyModal.tsx`: 회원 본인 Gemini API 키 연동 다크 모달

---

## 4. 플랫폼 연동 규칙 준수
- **최상위 불변 규칙 (Rule 00 — 회원 본인 계정 및 API 키 원칙)**:
  - 모든 음원 분석은 회원 본인이 등록한 Google Gemini API 키(`user_api_keys.provider = 'gemini'`)로만 구동.
  - 운영자 키 폴백이나 우회 로직 일절 없음.
- **음원 데이터 소유 및 30일 격리 원칙**:
  - 업로드된 오디오는 Gemini 멀티모달 호출 메모리에서 즉시 해제되며 서버에 영구 보관되지 않음.
  - 마크다운 회의록 및 분석 결과는 회원 본인 소유로 격리.

---

## 5. 실세션 검증 증거 (Microsoft Edge 최전면 포그라운드)
- **일반 회원 테스트 계정**: `buylifemall@naver.com` 실세션 인증 쿠키 주입 완료
- **검수 브라우저**: Microsoft Edge (`headless: false`, `--start-maximized`)
- **검수 스크립트**: `scripts/capture_edge_audio_v110.cjs`
- **6종 검증 캡처 목록**:
  1. 메인 스튜디오 전경: `edge_audio_desktop_studio_v110.png`
  2. 엔진 모드 & 업로더: `edge_audio_desktop_uploader_v110.png`
  3. 비주얼 가이드북 상단: `edge_audio_desktop_guide_v110.png`
  4. 가이드북 FAQ 아코디언: `edge_audio_desktop_guide_faq_v110.png`
  5. API 키 설정 다크 모달: `edge_audio_desktop_settings_v110.png`
  6. 모바일 반응형 뷰포트(375px): `edge_audio_mobile_guide_v110.png`
- **화면 유지**: 검수 완료 후 실제 Edge 브라우저 창 최전면 10분간 유지 확인 완료.

---

## 6. 버전 및 DB 이력
- `v1.10` (2026-10-19):
  - 사이버 네온 다크 콘솔 스타일 전면 리뉴얼 (오디오 인텔리전스 랩 에디션)
  - 독립 비주얼 가이드북 (`/guide`) 신설
  - `package.json` (`1.10.0`), `src/lib/version.ts` (`v1.10`), Supabase DB `programs` (`slug: ai-audio-analyzer`, `version: v1.10`) 3중 동기화 완비.

<!-- DETAILED_PROGRAM_REVIEW_20261019 -->
## 2026-10-19 Codex — 프로그램별 상세 개선 분석(구현 아님)

[세부 개선안·필요 이유·근거·시험 조건](docs/DETAILED_REVIEW_20261019.md) · [전체 83개 분석](../docs/program-reviews-20261019/INDEX.md) · [공통 아이디어 표](../docs/PROGRAM_IDEA_BACKLOG.md). 이 프로그램 3개 검토 항목입니다. 코드·DB·환경변수·배포는 바꾸지 않았습니다. 작업 전 최신 개선 원장·ACTIVE_WORK와 대조하고 이미 해결된 기능은 보존합니다. 후속 작업 후 처리 ID·증거·미완료·새 인사이트·프로그램 링크를 기록합니다.
<!-- /DETAILED_PROGRAM_REVIEW_20261019 -->

## 2026-10-21 v1.11 — API 이용 권한 확인(F-013)·4.5MB 넘는 파일 업로드(F-014) (Claude Code 윈도우)
- 플랜: [docs/PLAN_20261021_ACCESS_AND_LARGE_UPLOAD.md](docs/PLAN_20261021_ACCESS_AND_LARGE_UPLOAD.md) (음악 병합 분석 결정 5번 — 병합 M1보다 먼저).
- **권한**: `src/lib/programAccess.ts`를 최신 공용 판정 사본(`ai-mastering-studio`와 같은 파일, 루트 `lib/access/checkProgramAccess.ts` 규칙: 정지 → 관리자 → 핸드폰 → FREE → 구독 → 등급+기간)으로 교체하고 `src/lib/access.ts`(`getProgramAccess`·`checkProgramAccessApi`) 추가. 첫 화면(핸드폰 없으면 메인 설정으로), `api/analyze`·`api/user-key`·`api/upload/start` 모두 권한 확인 + `dynamic`·`fetchCache`. 옛 판정의 무기한 권한(만료일 비어 있음) 차단 버그도 사라짐.
- **큰 파일**: `api/upload/start`가 회원 본인 키로 Gemini Files API 이어 올리기 세션을 시작(요청 사이트 주소 Origin을 Google에 함께 전달 — 이것이 있어야 브라우저 직접 업로드가 CORS로 허용됨)하고 키 없는 올림 주소만 돌려줌 → 브라우저가 그 주소로 파일을 직접 올림(진행률 표시) → `api/analyze`는 파일 주소(`fileUri`)만 JSON으로 받아 `fileData`로 분석, 끝나면 Google 쪽 파일 삭제 요청. 한도 100MB로 화면·가이드 통일, 분석 시간 제한 300초. 서버를 거쳐 4MB 조각으로 보내는 방식은 Google 조각 단위가 8MB라 실패해 버림(`docs/ERROR_LESSONS.md` 2026-10-21).
- 검수: tsc·build, Vercel 프로덕션 배포 Ready, DB `programs.version = v1.11`. 크롬(일반 회원 계정)에서 7.45MB 한국어 음성 WAV를 「음성·회의록」 모드로 실제 분석 성공(화자 2명·00:41·결정·질문·받아쓰기 표시, Gemini 2.5 Flash 1회 호출). 권한 없는 회원의 차단은 FREE 배지라 실제 시험 대상이 없어 코드 확인으로 대신함. Google 쪽 파일 삭제는 코드상 요청만 확인(실제 삭제 여부 미확인, 실패해도 48시간 뒤 자동 삭제).
- 남은 일: auto 모드가 판별·분석으로 두 번 호출(비용 2배, D-71-02), `next lint` 실패(F-019), m4a 등 형식별 MIME 확인.
