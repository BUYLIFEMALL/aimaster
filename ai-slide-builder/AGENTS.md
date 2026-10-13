# AI 슬라이드 자동화 (ai-slide-builder) 인수인계 문서

> **버전**: v1.02  
> **프로그램명**: AI 슬라이드 자동화  
> **슬러그**: `ai-slide-builder`  
> **배포 URL**: `https://ai-slide-builder.buylife.xyz`  
> **공통 최상위 규칙 준수**: 사용자는 본인의 계정과 본인의 Gemini API 키를 직접 등록하여 사용한다.

---

## 1. 개요 및 목적
Google Gemini AI(`gemini-2.5-flash`)와 멀티포맷 파일 파서를 기반으로 회의록, 기획서, 논문 등 비정형 텍스트로부터 22가지 전문 시각화 패턴의 프레젠테이션 JSON 구성안을 자동 생성하고, 시각적 카드 뷰 편집기에서 실시간 양방향 수정 및 원클릭 PPTX 다운로드를 제공하는 웹 프레젠테이션 자동화 스튜디오입니다.

---

## 2. 핵심 아키텍처 및 지원 스키마

### 1) 3대 생성 프롬프트 엔진
- **표준 형식** (まじん 기반): 22개 시각화 패턴, 논리적 기승전결, 발표자 스피커 노트(`notes`) 자동 생성
- **확장판** (kimura_yoshiki 기반): 표/차트 대용량 텍스트 대응 및 13행 이상 표 자동 분할
- **C-Suite 보고 형식** (GPT PARK 기반): 한국 대기업 임원 보고용 두괄식(So What? & Why?), 10대 보고 주제, 7대 보고 목적, 발표 시간별 분량 최적화 (10분/15분/20~30분/30분 이상)

### 2) 22가지 전문 슬라이드 타입
- `title`, `section`, `closing`, `content`, `agenda`, `compare`, `process`, `processList`, `timeline`, `diagram`, `cycle`, `cards`, `headerCards`, `table`, `progress`, `quote`, `kpi`, `bulletCards`, `faq`, `statsCompare`, `barCompare`, `triangle`, `pyramid`, `flowChart`, `stepUp`, `imageText`

### 3) 주요 컴포넌트 구조
- `src/components/layout/Sidebar.tsx`: `docs/SIDEBAR_LAYOUT_STANDARD.md` 규격에 맞춘 좌측 메뉴 (1-2-3 번호형 작업 흐름, API키등록, 바짝 붙은 계정 및 로그아웃)
- `src/components/layout/Header.tsx`: 화이트 테마 상단 헤더 및 API 연동 배지
- `src/components/studio/EditorSection.tsx`: 좌측 슬라이드 데이터 생성 패널 & JSON 실시간 에디터
- `src/components/studio/SlideEditor.tsx`: 우측 슬라이드 카드 편집기 & 일괄 AI 수정 패널
- `src/components/studio/SlideCard.tsx`: 22개 타입별 전용 폼 & 개별 카드 AI 수정
- `src/components/studio/SlidePreviewModal.tsx`: 16:9 와이드스크린 실시간 슬라이드쇼 프리뷰어
- `src/components/studio/ActionFooter.tsx`: 원클릭 PPTX 다운로드, Google Slides GAS 연동, Gemini 링크
- `src/lib/pptxGenerator.ts`: `pptxgenjs` 기반 파워포인트 파일 생성기
- `src/lib/fileParser.ts`: PDF, DOCX, XLSX, TXT, CSV 파서

---

## 3. 프로그램 검수 및 배포 방법

```bash
cd D:\Antigravity\AIMaster\ai-slide-builder
npm run build
vercel deploy --prod --yes
```
