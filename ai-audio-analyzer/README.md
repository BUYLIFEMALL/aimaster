# AI Audio분석 자동화 (AI Audio Lab)

> Gemini 멀티모달 기반 음성 인텔리전스 리포트, 회의록 자동 생성, 음악 분석, Suno v5 역설계 프롬프트, 오디오 포렌식 스튜디오

## 🚀 빠른 시작

```bash
# 의존성 설치
npm install

# 로컬 개발 서버 실행
npm run dev

# 프로덕션 빌드 검증
npm run build
```

## 🛠️ 기술 스택
- **Framework**: Next.js 16 (App Router, Turbopack)
- **UI**: React 19, Tailwind CSS v4, Lucide React
- **AI Engine**: Google Gemini 2.5 Flash (`@google/genai`)
- **Audio Processing**: Web Audio API (Waveform Peak Extraction)
- **Database & Auth**: Supabase SSR


## B5 (2026-10-15) — 한국 시간 현재 월 기준 추가 (v1.03)

- 주 생성·분석 지침에 한국 시간 기준 현재 연·월을 반영하고, 계절·시기 표현은 현재 월에 맞추며 불필요한 계절·연도 표현을 덧붙이지 않도록 했습니다.
