# AI 슬라이드 자동화 (ai-slide-builder)

> **버전**: v1.06
> **프로그램명**: AI 슬라이드 자동화  
> **슬러그**: `ai-slide-builder`  
> **도메인**: [https://ai-slide-builder.buylife.xyz](https://ai-slide-builder.buylife.xyz)  
> **최상위 원칙 준수**: 사용자는 본인의 계정과 본인의 Gemini API 키를 직접 등록하여 사용합니다.

Google Gemini AI 및 멀티포맷 파일 파서를 활용하여 회의록, 기획서, 논문 등 비정형 텍스트로부터 전문 프레젠테이션 JSON 구성안을 자동 생성하고, 22개 전문 슬라이드 카드 편집 및 원클릭 16:9 와이드스크린 PPTX 다운로드를 지원하는 웹 기반 슬라이드 자동화 스튜디오입니다.

---

## 🌟 핵심 기능

1. **3대 특화 생성 포맷 (프롬프트 엔진)**
   - **표준 형식 (10~12P)**: 22개 전문 레이아웃, 논리적 스토리 전개, 발표자 스피커 노트(`notes`) 자동 생성
   - **확장판 (14~16P)**: 표/차트 대용량 텍스트 안정적 렌더링, 13행 이상 표 자동 분할
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
   - **💾 PPTX 파워포인트 즉시 다운로드**: 브라우저에서 16:9 와이드스크린 규격의 파워포인트 파일 생성 (스피커 노트 자동 삽입)
   - **🚀 Google 슬라이드 생성기**: Apps Script 웹앱 연동 지원
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

---

## 🚀 개발 및 배포

```bash
# 로컬 개발 서버
npm run dev

# 프로덕션 빌드 검증
npm run build

# Vercel 프로덕션 배포
vercel deploy --prod --yes
```


## B5 (2026-10-15) — 한국 시간 현재 월 기준 추가 (v1.06)

- 주 생성·분석 지침에 한국 시간 기준 현재 연·월을 반영하고, 계절·시기 표현은 현재 월에 맞추며 불필요한 계절·연도 표현을 덧붙이지 않도록 했습니다.


## 2026-10-16 DB 연동 변수 호환 — v1.07 (ai-slide-builder)

작업 전 [최상위 데이터베이스 연동 지침](../docs/DATABASE_CONNECTION_POLICY.md)과 [전체 전환 인수인계](../docs/DATABASE_CONNECTION_HANDOFF.md)를 먼저 읽습니다. 공개 키는 새 PUBLISHABLE 이름 우선·기존 ANON 이름 호환, 서버 키는 새 SECRET 이름 우선·기존 SERVICE_ROLE 이름 호환입니다. 새 값 없음/공백일 때만 같은 종류의 기존 값을 사용하며, 인증 실패 후 다른 키로 재시도하지 않습니다. 기존 변수·실제 키·회원 권한·Cron은 유지합니다. 배포·회원 검수 결과는 전체 인수인계의 프로그램별 기록에서 확인합니다. 기존 변수 삭제와 실제 키 폐기는 별개이며 안정화 확인 전 삭제하지 않습니다.
