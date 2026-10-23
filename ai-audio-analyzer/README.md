# AI Audio분석 자동화 (AI Audio Intelligence Lab) — v1.10

> **Google Gemini 2.5 Flash 멀티모달 오디오 AI 엔진 기반의 차세대 사운드 해체 및 분석 스튜디오**  
> 회의 음성의 화자 분리 회의록 자동화부터 Suno AI v5 음악 역설계, 고주파 음향 포렌식까지 완벽 지원합니다.

- **서비스 URL**: [https://audio.buylife.xyz](https://audio.buylife.xyz)
- **독립 가이드북**: [https://audio.buylife.xyz/guide](https://audio.buylife.xyz/guide)
- **최신 버전**: `v1.10` (사이버 네온 다크 콘솔 스타일 — 오디오 인텔리전스 랩 에디션)

---

## 🎧 핵심 기능 (Core Features)

1. **스마트 자동 판별 (Dual Multimodal AI)**
   - WAV, MP3, M4A, FLAC 음원을 드래그앤드롭하면 Gemini 2.5 Flash가 음성(대화/회의)과 음악(가요/연주곡)을 3초 만에 자동 판별합니다.
2. **음성 인텔리전스 & 회의록 자동화 (Speech Lab)**
   - 화자 분리(Speaker Diarization) 및 발언 점유율 계산
   - 타임라인별 초 단위 전사 기록
   - 화자별 역할, 화법 스타일, 핵심 질문 및 후속 실행 과제(Action Items) 추출
   - 마크다운 회의록 원클릭 복사
3. **음악 분석 & Suno v5 역설계 (Music Lab)**
   - **Suno AI v5 Reverse Prompt (God Tier)**: 동일한 분위기와 편곡을 재현하는 마스터 프롬프트 역설계
   - **음향 포렌식 & 위변조 품질 분석**: 고주파 절단면 감지로 MP3 가짜 고음질(Upscaled) 판별
   - **4대 스템 청각 묘사**: Vocals, Bass, Drums, Others 주파수 대역 및 믹싱 상세 묘사
   - **작곡 및 채보 데이터**: 조성(Key & Scale), 박자, 코드 진행(Chord Progression)
4. **인터랙티브 파형 뷰어 & 다크 콘솔 UI**
   - Web Audio API 기반 오디오 파형 피크 시각화 및 재생 컨트롤

---

## 🔒 100% 회원 본인 API 키 원칙 (BYOK)
- 회원 본인이 등록한 Google Gemini API 키로만 구동되며, 운영자 키 폴백이나 우회 로직이 일절 없습니다.
- 업로드된 오디오는 분석 직후 메모리에서 소멸되며 영구 서버에 저장되지 않습니다.
