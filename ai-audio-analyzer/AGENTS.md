# AI Audio분석 자동화 (ai-audio-analyzer) — 인수인계 문서

## 1. 개요
- **프로그램명**: AI Audio분석 자동화 (`ai-audio-analyzer`)
- **라이브 도메인**: https://audio.buylife.xyz
- **버전**: v1.03
- **v1.03 업데이트 내역 (2026-10-13)**:
  - `docs/SIDEBAR_LAYOUT_STANDARD.md` 표준 전면 반영:
    1. 헤더 순서 교정: 프로그램명 및 버전(`v1.03`) 최상단 ➔ 바로 아래 `← 다른 프로그램 보기` (`https://www.buylife.xyz/programs`) 링크 배치
    2. 작업 흐름 원형 번호 배지 & 세로 연결선(`w-px bg-slate-200`) 구조화
    3. 아이콘 중복 제거: `🔑 API키등록·플랫폼연동`, `💡 사용 가이드` 단일 이모지 정돈
    4. 계정 블록 밀착 배치: `flex-1` 제거 및 `min-h-0 shrink overflow-y-auto` 적용, 마지막 메뉴 바로 아래 8~16px 간격으로 사용자 계정 및 로그아웃 버튼 밀착 배치 (화면 하단 밀림 및 빈 공간 제거)
- **주요 기능**:
  1. **스마트 자동 판별**: Gemini 2.5 Flash가 오디오를 청취하여 음성(대화/인터뷰/회의)인지 음악(가요/연주곡/비트)인지 자동 감지.
  2. **음성 인텔리전스 & 회의록 자동화 (Speech Lab)**:
     - 화자 분리 및 발언 점유율 계산/시각화
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

## 2. 핵심 파일 구조
- `src/lib/gemini.ts`: Gemini 2.5 Flash 오디오 멀티모달 분석 엔진 (Base64 inlineData, JSON Schema)
- `src/lib/types.ts`: SpeechAnalysisResult, MusicAnalysisResult 등 전체 타입 정의
- `src/lib/version.ts`: APP_VERSION, APP_NAME, PROGRAM_SLUG 관리
- `src/components/studio/WaveformCanvas.tsx`: Web Audio API 파형 캔버스 및 플레이어
- `src/components/studio/AudioUploader.tsx`: 오디오 드래그앤드롭 업로더
- `src/components/studio/SpeechReportView.tsx`: 음성 대시보드 및 회의록/인터뷰 생성기
- `src/components/studio/MusicReportView.tsx`: 음악 대시보드, Suno v5 역설계, 포렌식, 4대 스템
- `src/components/studio/AudioAnalyzerApp.tsx`: 메인 스튜디오 컨테이너
- `src/components/layout/Sidebar.tsx`: 표준 화이트 사이드바 (모드 전환, 워크플로우 안내)
- `src/components/settings/ApiKeyModal.tsx`: 회원 본인 Gemini API 키 등록 및 유효성 검사

## 3. 플랫폼 연동 규칙 준수
- **최상위 불변 규칙 (Rule 00)**: 모든 호출은 회원 본인의 Google Gemini API 키(`user_api_keys.provider = 'gemini'`)를 직접 사용하여 진행.
- **기준 연도 2026년 동적 주입 (Rule 9)**: `new Date().getFullYear()`로 현재 연도 주입.
- **화이트 베이스 클린 테마 (Rule 8)** 준수.


## B5 (2026-10-15) — 한국 시간 현재 월 기준 추가 (v1.03)

- 주 생성·분석 지침에 한국 시간 기준 현재 연·월을 반영하고, 계절·시기 표현은 현재 월에 맞추며 불필요한 계절·연도 표현을 덧붙이지 않도록 했습니다.
