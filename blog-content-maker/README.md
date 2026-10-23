# AI 블로그 콘텐츠 제작 자동화 (blog-content-maker)

주제나 기존 원고를 바탕으로 클릭을 부르는 글감 발굴부터 5단계 플로우 위저드 기반 원고 작성, 실시간 문장/품질 점검, Gemini 최신 이미지 제작, 그리고 전용 크롬 확장을 통한 네이버 스마트에디터 ONE 자동 전송까지 지원하는 올인원 블로그 마케팅 솔루션입니다.

- **공식 서비스 URL**: [https://blog-content-maker.buylife.xyz](https://blog-content-maker.buylife.xyz)
- **현재 버전**: `v1.10` (확장 프로그램: `v1.10`, package: `1.10.0`)
- **적용 템플릿**: **플로우 위저드 스타일 — 단계별 블로그 콘텐츠 에디션**

---

## 1. 개요 및 사용 목적
- 글감·제목 10개 추천부터 정보성/후기형 5가지 모드의 원고 작성 지원.
- 원문과 수정 이력을 보존하며, 반복 단어·FAQ·문단 길이 실시간 점검(Audit).
- Gemini 최신 모델(`gemini-nano-banana-2.1`, `gemini-3-pro-image`)을 활용한 본문 이미지 및 제품 합성 이미지 생성.
- 전용 크롬 확장을 통해 네이버 스마트에디터 ONE에 제목·본문·이미지 원클릭 자동 입력.

---

## 2. 5단계 핵심 작업 흐름 (Workflow Pipeline)
1. **글감·제목 찾기 (`/ideas`)**: 핵심 키워드 입력 시 10가지 매력적인 제목 추천
2. **원고 만들기 (`/write`)**: 5가지 작성 모드로 서론·본론·결론 완성형 초안 작성
3. **글 점검·다듬기 (`/review`)**: 제목 일치율, 반복 단어, 문단 길이 실시간 점검
4. **이미지·장면 준비 (`/images`)**: 본문 소주제별 설명 및 제품 합성 이미지 제작
5. **네이버로 옮기기 (`/export`)**: 전용 크롬 확장으로 네이버 편집기 자동 입력 및 ZIP/HTML 내보내기

---

## 3. 기술 스택
- Next.js 16.4.1 (Turbopack, App Router)
- React 19.3.0, TypeScript 5.9.3
- Google Gemini API (`@google/genai`), OpenAI API
- Supabase (Auth, PostgreSQL, Storage)
- Chrome Extension (Manifest V3)

---

## 4. 인수인계 및 작업 문서
- 개발 및 작업 지침 규격서: [`AGENTS.md`](AGENTS.md)
- 디자인 리뉴얼 인수인계서: [`docs/DESIGN_HANDOFF.md`](docs/DESIGN_HANDOFF.md)
- 개선 제안 보고서: [`docs/IMPROVEMENTS.md`](docs/IMPROVEMENTS.md)
- 작업 대기 백로그: [`docs/IMPROVEMENT_BACKLOG.md`](docs/IMPROVEMENT_BACKLOG.md)
- 사전 개발 플랜: [`docs/PLAN_20261018_DESIGN_RENEWAL.md`](docs/PLAN_20261018_DESIGN_RENEWAL.md)
