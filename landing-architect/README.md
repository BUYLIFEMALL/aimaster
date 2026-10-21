# AI 랜딩페이지 기획 자동화 (landing-architect)

> **공식 프로덕션 URL**: [https://landing-architect.buylife.xyz](https://landing-architect.buylife.xyz)  
> **현재 버전**: `v1.11` (2026-10-21 🧩 UI Canvas로 보내 다듬기 추가, 상세는 `AGENTS.md`)  
> **최신 갱신일**: 2026-10-19

---

## 1. 개요 및 목적
`landing-architect`는 제품/서비스의 주제·타겟·목표만 입력하면 AI가 전문 마케터 수준의 **6대 핵심 전환 블록 기획안(JSON/Markdown)**과 실제 반응형으로 인터랙티브하게 작동하는 **고화질 HTML 프로토타입**을 실시간 생성하는 전자동 웹 기획 솔루션입니다.

---

## 2. 주요 기능
- **20종 업종별 템플릿**: SaaS, 모바일 앱, 교육, 커머스 등 전환 프레임워크 지원.
- **6대 핵심 전환 블록**: 히어로, 문제제기, 솔루션, 소셜프루프, 가격 & 오퍼, FAQ.
- **실시간 반응형 HTML 프로토타입**: Tailwind CSS 기반 모바일/태블릿/데스크톱 뷰포트 지원.
- **다양한 내보내기**: 단일 HTML 파일 다운로드, JSON/Markdown 내보내기, React/Next.js 변환 프롬프트 복사.
- **독립 비주얼 가이드북 (`/guide`)**: 4단계 파이프라인, BYOK 보안 안내, 6대 블록 쇼케이스, FAQ 5종 완비.
- **철저한 보안 원칙 (BYOK)**: 사용자 본인의 Google Gemini API 키로 동작하며 타인과 공유되지 않음.

---

## 3. 기술 스택
- **Framework**: Next.js 16.4.0 (Turbopack, App Router), React 19.3.0, TypeScript 5.9.3.
- **Styling**: Flow Wizard Token CSS (`globals.css`), Tailwind CSS.
- **Icons**: Lucide React.
- **AI Models**: Google Gemini 3.1 Pro Preview / Gemini 2.5 Flash (`@google/genai`).
- **Database/Auth**: Supabase Database & Auth (`@supabase/supabase-js`, `@supabase/ssr`).

---

## 4. 로컬 개발 및 실행
```bash
# 의존성 설치
npm install

# 단위 테스트 실행 (12건)
npm test

# TypeScript 타입 검사
npx tsc --noEmit

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
