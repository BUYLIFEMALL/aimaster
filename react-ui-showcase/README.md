# AI 웹 UI 제작 자동화 (react-ui-showcase / ai-web-ui)

React 19 및 Tailwind CSS 기반의 12대 필수 UI 컴포넌트 갤러리, 10종 인터랙티브 시뮬레이터 데모, 클린 TSX 원클릭 소스 코드 복사 라이브러리 및 AI 맞춤 컴포넌트 실시간 생성 솔루션입니다.

- **공식 서비스 URL**: [https://react-ui-showcase.buylife.xyz](https://react-ui-showcase.buylife.xyz)
- **현재 버전**: `v1.05`
- **적용 템플릿**: **크리에이티브 아틀리에 스타일 — 리액트 쇼케이스 변형**

---

## 1. 개요 및 사용 목적
- 외부 무거운 UI 프레임워크 설치 없이 즉시 프로젝트에 복사해 사용할 수 있는 단일 파일 클린 TSX 컴포넌트 제공.
- 실무 인터랙션(폼 검증, 탭 전환, 미디어 플레이어 등)을 팝업으로 직접 조작해 보는 10종 실전 데모실 운영.
- 회원 본인의 Google Gemini API 키를 연동하여 자연어 프롬프트 기반으로 즉시 맞춤 UI 컴포넌트 TSX 코드 생성.

---

## 2. 4대 핵심 작업 흐름 (Workflow)
1. **컴포넌트 갤러리 (`/?tab=gallery`)**: 12대 필수 UI 요소의 모든 변형, 크기, 상태 실시간 비교
2. **인터랙티브 데모실 (`/?tab=demos`)**: 10종 실무 시나리오 인터랙션 체험
3. **코드 라이브러리 (`/?tab=code`)**: 클린 TSX 코드 구문 강조 뷰어 및 원클릭 복사
4. **AI 컴포넌트 생성기 (`/?tab=ai`)**: 자연어 프롬프트 기반 맞춤 컴포넌트 자동 빌드

---

## 3. 기술 스택
- Next.js 16.2.11 (Turbopack, App Router)
- React 19.2.4, TypeScript 5.9
- Tailwind CSS 4.0.0
- Google Gemini API (`@google/genai`)
- Supabase (Auth, PostgreSQL)

---

## 4. 인수인계 및 작업 문서
- 개발 및 작업 지침 규격서: [`AGENTS.md`](AGENTS.md)
- 디자인 리뉴얼 인수인계서: [`docs/DESIGN_HANDOFF.md`](docs/DESIGN_HANDOFF.md)
- 개선 제안 보고서: [`docs/IMPROVEMENTS.md`](docs/IMPROVEMENTS.md)
- 작업 대기 백로그: [`docs/IMPROVEMENT_BACKLOG.md`](docs/IMPROVEMENT_BACKLOG.md)
- 사전 개발 플랜: [`docs/PLAN_20261018_DESIGN_RENEWAL.md`](docs/PLAN_20261018_DESIGN_RENEWAL.md)
