# AI 슬라이드 자동화 (ai-slide-builder)

> **공식 프로덕션 URL**: [https://ai-slide-builder.buylife.xyz](https://ai-slide-builder.buylife.xyz)  
> **현재 버전**: `v1.10` (플로우 위저드 스타일 — 단계별 슬라이드 기획 에디션)  
> **최신 갱신일**: 2026-10-19

---

## 1. 개요 및 목적
`ai-slide-builder`는 비정형 문서(기획서, 회의록, 보고서 등)나 단순한 주제 키워드로부터 Google Gemini AI를 활용하여 **22가지 전문 시각화 패턴의 프레젠테이션 장표**와 발표자 스피커 노트를 1초 만에 자동 생성하고, 실시간 편집 후 **16:9 와이드스크린 파워포인트(PPTX)**로 원클릭 다운로드하는 프레젠테이션 자동화 스튜디오입니다.

---

## 2. 주요 기능
- **22종 전문 시각화 레이아웃**: 타임라인, 비교대조, 피라미드, KPI, 프로세스, FAQ 등 완비.
- **3대 맞춤 프롬프트 엔진**: 표준 발표용(10~12P), 대용량 표/차트 분석용(14~16P), C-Suite 임원보고 두괄식 피칭.
- **발표자 스피커 노트 (Notes) 자동 삽입**: 각 장표마다 발표 대본을 작성하여 PPTX 발표자 노트에 자동 내장.
- **16:9 와이드스크린 파워포인트 (PPTX)**: 브라우저에서 직접 생성하는 고화질 PPTX 바이너리.
- **독립 비주얼 가이드북 (`/guide`)**: 4단계 파이프라인, BYOK 보안 안내, 22종 레이아웃 쇼케이스, FAQ 5종 완비.
- **철저한 보안 원칙 (BYOK)**: 사용자 본인의 Google Gemini API 키로 동작하며 타인과 절대 공유되지 않음.

---

## 3. 기술 스택
- **Framework**: Next.js 16.2.11 (Turbopack, App Router), React 19.2.4, TypeScript 5.
- **Styling**: Tailwind CSS v4, Flow Wizard Token CSS (`globals.css`).
- **Icons**: Lucide React.
- **AI Models**: Google Gemini 2.5 Flash (`@google/genai`).
- **Presentation Binary**: `pptxgenjs` (16:9 PPTX), `pdfjs-dist` (PDF 멀티 파서).
- **Database/Auth**: Supabase Database & Auth (`@supabase/ssr`, `@supabase/supabase-js`).

---

## 4. 로컬 개발 및 실행
```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build
```

---

## 5. 인수인계 문서 링크
- 작업 지침 및 상세 아키텍처: [AGENTS.md](AGENTS.md)
- 디자인 리뉴얼 인수인계서: [docs/DESIGN_HANDOFF.md](docs/DESIGN_HANDOFF.md)
- 개선사항 및 고도화 제안: [docs/IMPROVEMENTS.md](docs/IMPROVEMENTS.md)
- 추가 개발 백로그: [docs/IMPROVEMENT_BACKLOG.md](docs/IMPROVEMENT_BACKLOG.md)
