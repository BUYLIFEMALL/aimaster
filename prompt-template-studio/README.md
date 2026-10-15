# AI 프롬프트 템플릿 자동화 (Prompt Template Studio)

> **버전**: `v1.02`
> **공식 도메인**: `https://prompt-template.buylife.xyz`  
> **프로젝트 디렉토리**: `prompt-template-studio`  
> **플랫폼**: AIMaster 통합 서브프로젝트 (카탈로그 1위)

---

## 1. 프로그램 개요
자주 사용하는 고품질 프롬프트를 나만의 보관함에 템플릿으로 저장하고, 변경이 필요한 핵심 키워드나 데이터를 동적 변수(`{{변수명}}`)로 지정하여 필요할 때마다 원클릭으로 변수 자동 채우기 및 Gemini AI 실행까지 완결하는 프롬프트 라이브러리 자동화 스튜디오입니다.

---

## 2. 주요 핵심 기능
1. **템플릿 라이브러리 & 카테고리 관리**:
   - 9종 기본 프리셋 내장 및 5대 카테고리(`Writing`, `Coding`, `Business`, `Marketing`, `Personal`).
   - 무제한 커스텀 카테고리 추가 및 실시간 필터링/키워드 검색.
2. **동적 변수(`{{variable}}`) 자동 감지**:
   - 프롬프트 작성 시 중괄호 2개(`{{...}}`)를 실시간 파싱하여 태그 칩 및 입력 폼 자동 생성.
3. **제작 시 AI 3단 어시스턴트**:
   - 제목 입력 시 ➔ `설명 자동 생성`
   - 설명 입력 시 ➔ `프롬프트 본문 및 변수 구조 자동 생성`
   - 본문 입력 시 ➔ `어울리는 제목 추천`
4. **실행 시 AI 변수 자동 채우기**:
   - 변수 입력 모달에서 "AI 자동 채우기" 버튼을 누르면 Gemini AI가 상황에 맞는 최적의 예시 데이터를 자동으로 쏙 채워줌.
5. **원클릭 프롬프트 실행 & 마크다운 뷰어**:
   - 치환된 완성본을 회원 본인 Gemini 2.5 Flash 모델로 즉시 실행.
   - 스트리밍/마크다운 렌더링, 원클릭 클립보드 복사 및 `.md` 파일 다운로드 지원.
6. **JSON 백업 & 복원**:
   - 나만의 프롬프트 템플릿을 표준 JSON 파일로 안전하게 백업 및 언제든지 파일 업로드 복원 지원.
7. **최상위 절대 불변 규칙 준수**:
   - 회원 본인의 Google Gemini API 키 독립 연동 (`user_api_keys.provider = 'gemini'`). 운영자 키 폴백 금지.
8. **기준 연도 2026년 주입**:
   - 모든 AI 프롬프트 실행 및 결과물 생성 시 현재 당해 연도(2026년)를 기준 연도로 자동 반영.

---

## 3. 기술 스택 & 구조
- **Framework**: Next.js 16 (App Router, Turbopack)
- **Styling**: Tailwind CSS (화이트 베이스 클린 테마)
- **AI Engine**: Google GenAI SDK (`@google/genai`, Gemini 2.5 Flash)
- **Auth & DB**: Supabase (AIMaster 통합 SSO, `.buylife.xyz` 쿠키 도메인 공유)
- **Deployment**: Vercel (`prompt-template-studio`, Custom Domain: `prompt-template.buylife.xyz`)


## B5 (2026-10-15) — 한국 시간 현재 월 기준 추가 (v1.02)

- 주 생성·분석 지침에 한국 시간 기준 현재 연·월을 반영하고, 계절·시기 표현은 현재 월에 맞추며 불필요한 계절·연도 표현을 덧붙이지 않도록 했습니다.
