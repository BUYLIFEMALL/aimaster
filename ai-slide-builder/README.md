# AI 슬라이드 자동화 (ai-slide-builder)

> **버전**: v1.05  
> **프로그램명**: AI 슬라이드 자동화  
> **슬러그**: `ai-slide-builder`  
> **도메인**: `https://ai-slide-builder.buylife.xyz`

Google Gemini AI 및 멀티포맷 파일 파서를 활용하여 회의록, 기획서, 논문 등 비정형 텍스트로부터 전문 프레젠테이션 JSON 구성안을 자동 생성하고, 22개 전문 슬라이드 카드 편집 및 원클릭 PPTX 다운로드를 지원하는 웹 기반 슬라이드 자동화 스튜디오입니다.

---

## 🌟 핵심 기능

1. **3대 특화 생성 포맷 (프롬프트 엔진)**
   - **표준 형식**: 22개 전문 레이아웃, 논리적 스토리 전개, 발표자 스피커 노트(`notes`) 자동 생성
   - **확장판**: 표/차트 대용량 텍스트 안정적 렌더링, 13행 이상 표 자동 분할
   - **C-Suite 보고 형식**: 한국 대기업 C-Level 임원 보고용 두괄식(So What? & Why?), 10대 보고 주제, 7대 보고 목적, 발표 시간별 분량 조절 (10분/15분/20~30분/30분 이상)

2. **웹 검색 최신 정보 반영 (Google Search)**
   - 주제만 입력했거나 최신 통계가 필요할 때 AI가 공신력 있는 웹소스를 검색해 실시간 반영

3. **멀티포맷 파일 파서**
   - DOCX, PDF, TXT, MD, CSV, XLS, XLSX 원클릭 드래그앤드롭 업로드 및 구조적 자동 요약

4. **실시간 양방향 슬라이드 편집기**
   - 좌측 JSON 에디터 ↔ 우측 카드 에디터 간의 완벽한 양방향 동기화
   - 카드 순서 이동(▲, ▼), 삭제(×), 항목 추가(+) 기능
   - 개별 카드별 "AI로 수정하기" 및 전체 슬라이드 일괄 "AI로 전체 수정하기"

5. **프레젠테이션 변환 & 내보내기**
   - **💾 PPTX 파워포인트 즉시 다운로드**: 브라우저에서 16:9 와이드스크린 규격의 파워포인트 파일 생성
   - **🚀 Google 슬라이드 생성기**: Apps Script 웹앱 연동
   - **✨ Gemini 연동**: Gemini 프롬프트 원클릭 활용
   - **16:9 슬라이드쇼 실시간 프리뷰어**: 브라우저 상에서 실제 발표 화면처럼 넘겨보며 검토

---

## 🛠️ 기술 스택

- **Framework**: Next.js 16 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS v4, Lucide React
- **AI Engine**: `@google/genai` (Gemini 2.5 Flash)
- **PowerPoint Generator**: `pptxgenjs` (16:9 레이아웃, 스피커 노트 자동 포함)
- **Document Parsers**: `pdfjs-dist`, `mammoth`, `xlsx`
- **Auth & Storage**: Supabase SSR (`@supabase/ssr`, `@supabase/supabase-js`)
- **Key Policy**: 회원 본인 Google Gemini API 키 등록 연동 (Rule 00)
