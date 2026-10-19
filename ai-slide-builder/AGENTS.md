# AI 슬라이드 자동화 (ai-slide-builder) — 인수인계 및 작업 지침

> **공식 서비스 URL**: https://ai-slide-builder.buylife.xyz  
> **현재 버전**: `v1.10` (플로우 위저드 스타일 — 단계별 슬라이드 기획 에디션)  
> **작업 일자**: 2026-10-19  
> **작업 에이전트**: Antigravity CLI (Windows)

---

## 1. 프로그램의 사용 목적 및 대상
- **사용 목적**:
  - 비정형 문서(기획서, 회의록, 제안서, 논문, 데이터 시트 등)나 단순한 주제 키워드로부터 Google Gemini AI를 활용하여 **22가지 전문 시각화 패턴의 프레젠테이션 장표 데이터**를 자동 생성하고,
  - 양방향 시각 카드 편집기에서 실시간 커스터마이징한 뒤 **16:9 와이드스크린 규격의 파워포인트(PPTX)** 파일로 즉시 다운로드하거나 Google Slides로 전송하는 오피스 자동화 솔루션.
- **주요 대상**:
  - 제안서, 보고서, 강의안 제작 시간이 부족한 직장인 및 기획자.
  - IR 피칭 덱과 사업 계획서를 빠르게 구조화하려는 스타트업 창업가.
  - C-Level 임원 보고용 두괄식 프레젠테이션을 작성해야 하는 비즈니스 전문가.

---

## 2. 개발 구현에 사용된 도구 / 개발 기법 / 플러그인 / 스킬
- **프레임워크**: Next.js 16.2.11 (App Router, Turbopack), React 19.2.4, TypeScript 5.
- **스타일링**: Tailwind CSS v4 (`@tailwindcss/postcss`), Flow Wizard Token CSS (`globals.css`).
- **아이콘 라이브러리**: `lucide-react`.
- **AI 연동 엔진**:
  - `@google/genai` (Google Gemini 2.5 Flash).
  - 3대 맞춤 프롬프트 엔진 (`standard`, `kimura`(대용량 표), `gpt_park`(C-Suite 임원보고)).
  - 회원 본인 API 키 원칙 (BYOK — Bring Your Own Key).
- **바이너리 생성 및 파일 파서**:
  - `pptxgenjs`: 16:9 와이드스크린 파워포인트 바이너리 직접 생성 (스피커 노트 자동 포함).
  - `pdfjs-dist`: PDF 문서 텍스트 고속 추출 파서.
- **데이터베이스 & 인증**: Supabase Auth & Database (`@supabase/ssr`, `@supabase/supabase-js`).
- **검수 도구**: Microsoft Edge 최전면 포그라운드 실세션 검수.

---

## 3. 핵심 기능 및 시스템 로직 / 아키텍처, 장점 및 단점

### 3.1 핵심 기능
1. **22가지 전문 슬라이드 타입 지원**:
   - 도입/결론: `title`, `section`, `closing`, `agenda`
   - 기본 본문: `content`, `quote`, `faq`
   - 프로세스/흐름: `process`, `processList`, `timeline`, `cycle`, `flowChart`, `stepUp`
   - 비교/분석: `compare`, `statsCompare`, `barCompare`
   - 데이터/성과: `table`, `progress`, `kpi`
   - 구조/카드: `cards`, `headerCards`, `bulletCards`, `triangle`, `pyramid`, `imageText`
2. **3대 맞춤 생성 프롬프트 엔진**:
   - 표준 형식 (10~12P): 기승전결이 있는 발표용 슬라이드.
   - 확장판 (14~16P): 대용량 표와 상세 분석 장표.
   - C-Suite 보고 형식: 임원 결재용 두괄식 보고서.
3. **발표자용 스피커 노트 (Notes) 자동 편성**:
   - 각 장표마다 발표자가 실제로 청중 앞에서 읽을 발표 대본을 함께 작성하여 PPTX 발표자 노트에 자동 삽입.
4. **독립 비주얼 가이드북 (`/guide`) 신설**:
   - 4단계 파이프라인, BYOK 보안 배너, 22종 레이아웃 쇼케이스, FAQ 5종 아코디언 완비.

### 3.2 시스템 아키텍처
- `src/lib/gemini.ts`: 3대 프롬프트 템플릿 주입 및 Gemini 2.5 Flash 호출/JSON 파서.
- `src/lib/pptxGenerator.ts`: 22개 슬라이드 타입별 pptxgenjs 도형/텍스트/차트 매핑 엔진.
- `src/lib/fileParser.ts`: PDF, DOCX, XLSX, TXT, CSV 멀티포맷 파서.
- `src/components/studio/`: `EditorSection`(좌측 입력), `SlideEditor`(우측 카드 편집), `ActionFooter`(다운로드).
- `src/app/guide/`: 독립 비주얼 가이드북 라우트 (`page.tsx` + `GuideClient.tsx`).

### 3.3 장점 및 단점
- **장점**:
  - 복잡한 프레젠테이션 제작 과정을 단 1분 만에 완성.
  - 전 세계 표준 파워포인트(PPTX) 바이너리로 바로 다운로드되어 호환성 100%.
  - 모바일에서도 플로팅 햄버거 메뉴를 통해 완벽한 반응형 뷰포트 지원.
- **단점**:
  - 표나 차트가 지나치게 방대할 경우 2개 이상의 장표로 자동 분할되므로 세부 검토 권장.

---

## 4. 현재 버전 및 버전별 변경 히스토리

### v1.10 (2026-10-19) — 플로우 위저드 스타일 테마 리뉴얼 (Antigravity CLI)
- **디자인 전면 개편**:
  - 소프트 슬레이트 화이트(`#f8fafc`) 배경과 로열 인디고 블루(`#2563eb`), 아티스틱 바이올렛(`#8b5cf6`) 기반 플로우 위저드 스타일 적용.
  - 메인 스튜디오 상단 웰컴 히어로 배너(`.studio-hero`) 및 3대 KPI 카드(22종 레이아웃, 3대 엔진, 16:9 PPTX) 탑재.
- **독립 비주얼 가이드북 (`/guide`) 신설**:
  - 4단계 제작 파이프라인, BYOK 보안 안내, 22종 레이아웃 쇼케이스, FAQ 5종 완비.
- **사이드바 메뉴 표준화**:
  - 브랜드 뱃지 `v1.10 SLIDE WIZARD` 적용.
  - `📖 연동 & 사용 매뉴얼` 앰버 골드 하이라이트 배지 메뉴 신설.
  - 모바일 반응형 햄버거 플로팅 드로어 메뉴 완비.
- **버전 3중 동기화**: `package.json`(1.10.0), `src/lib/version.ts`(v1.10), Supabase DB `programs`(v1.10).
- **무결성 검증**:
  - Next.js Turbopack 최적화 빌드 성공 및 Vercel 프로덕션 배포 (`dpl_AWZmbVsMYJcmpGxNcYXpASkpPfiF`).
  - Microsoft Edge 최전면 포그라운드 실세션 검수 (6종 캡처 완료 및 10분 창 유지).

### v1.07 (2026-10-16) — 데이터베이스 연동 환경변수 호환
- Supabase 신규 `PUBLISHABLE`/`SECRET` 키 및 기존 `ANON`/`SERVICE_ROLE` 키 듀얼 호환 적용.

### v1.06 (2026-10-15) — 한국 시간 현재 월 기준 추가
- AI 슬라이드 작성 시 한국 시간 현재 연/월 기준 주입.

---

## 5. 남아 있는 추가 프로그램 및 디자인 작업 대기 내용
- 상세 내용은 `docs/IMPROVEMENT_BACKLOG.md` 참고:
  - 장표별 배경 색상/브랜드 팔레트 커스텀 테마 선택기.
  - PPTX 외에 Keynote 및 Google Slides 직접 API 발행 연동.
  - AI 이미지 자동화(`ai-image-studio`) 연계를 통한 슬라이드별 삽화 자동 생성.

---

## 6. 기존 다른 프로그램과의 연계 / 기능 병합 제안
1. **69번 `landing-architect` (AI 랜딩페이지 기획)과의 연계**:
   - `landing-architect`의 기획안 내용을 바탕으로 투자자용 피칭 슬라이드를 원클릭 자동 생성.
2. **68번 `ai-writing-editor` (AI 글쓰기/카피라이팅)과의 연계**:
   - 긴 비즈니스 기획서나 보고서 원문을 `ai-slide-builder`로 전달하여 핵심 요약 발표 장표로 자동 압축.
3. **80번 `banana-canvas` / 70번 `ui-canvas`와의 연계**:
   - 슬라이드 내 도표나 다이어그램을 캔버스 툴로 전송하여 벡터 그래픽으로 정밀 커스텀.

---

## 7. 사용자 편의성 증대를 위한 디자인 UI 개선안
1. **슬라이드 드래그 앤 드롭 순서 변경**:
   - 우측 편집기에서 슬라이드 카드를 마우스로 끌어 장표 순서를 자유롭게 재배치.
2. **장표별 컬러 프리셋 스위처**:
   - 기업 브랜드 컬러(블루, 레드, 다크, 그린 등)에 맞춰 PPTX 테마 색상을 한 번에 변경.
3. **전체화면 프레젠테이션 미리보기 모드 단축키**:
   - F5 키를 누르면 파워포인트 없이도 브라우저에서 바로 슬라이드쇼 발표를 진행할 수 있는 전체화면 뷰어 지원.

<!-- DETAILED_PROGRAM_REVIEW_20261019 -->
## 2026-10-19 Codex — 프로그램별 상세 개선 분석(구현 아님)

[세부 개선안·필요 이유·근거·시험 조건](docs/DETAILED_REVIEW_20261019.md) · [전체 83개 분석](../docs/program-reviews-20261019/INDEX.md) · [공통 아이디어 표](../docs/PROGRAM_IDEA_BACKLOG.md). 이 프로그램 3개 검토 항목입니다. 코드·DB·환경변수·배포는 바꾸지 않았습니다. 작업 전 최신 개선 원장·ACTIVE_WORK와 대조하고 이미 해결된 기능은 보존합니다. 후속 작업 후 처리 ID·증거·미완료·새 인사이트·프로그램 링크를 기록합니다.
<!-- /DETAILED_PROGRAM_REVIEW_20261019 -->
