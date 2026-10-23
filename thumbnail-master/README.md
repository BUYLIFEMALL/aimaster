# AI 썸네일 마스터 자동화 (thumbnail-master)

영상 주제와 시청 타겟을 기반으로 클릭률(CTR)이 높은 A/B 전략 문구와 고해상도 썸네일 2종을 한 번에 생성하는 솔루션입니다.

- **공식 서비스 URL**: [https://thumbnail-master.buylife.xyz](https://thumbnail-master.buylife.xyz)
- **현재 버전**: `v1.07`
- **적용 템플릿**: 크리에이티브 아틀리에 스타일 — 썸네일 매거진 변형

---

## 1. 개요 및 사용 목적
- 영상 주제나 대본을 바탕으로 직관형(A안)과 호기심형(B안) 카피를 자동 도출.
- 시청 타겟(10대~시니어)에 맞춘 텍스트 크기와 그래픽 구도를 반영하여 문구가 들어간 16:9 썸네일 동시 생성.
- 프로젝트 자동 저장 및 JPG 다운로드 지원.

---

## 2. 주요 기능
- **A/B 듀얼 전략 생성**: 텍스트 카피와 비주얼 구도를 2종 세트로 제공.
- **맞춤형 스타일 옵션**: 단색 테두리, 네온 글로우, 손그림 테두리, 채널 브랜딩 로고/텍스트 위치 선택.
- **비주얼 에디토리얼 가이드북 (`/guide`)**: 3단계 파이프라인 및 타겟별 가독성 요령 상세 안내.
- **회원 본인 Gemini API 키 연동**: 데이터 격리 및 RLS 보안 준수.

---

## 3. 기술 스택
- Next.js 16.4.0 (Turbopack, App Router)
- React 19.3.0, TypeScript 5.9.3
- Google Gemini API (`gemini-3.5-flash`, `gemini-nano-banana-2.1`, `gemini-3-pro-image`)
- Sharp (이미지 무손실 최적화)
- Supabase (PostgreSQL, Storage)

---

## 4. 인수인계 및 작업 문서
- 개발 및 작업 지침 규격서: [`AGENTS.md`](AGENTS.md)
- 디자인 리뉴얼 인수인계서: [`docs/DESIGN_HANDOFF.md`](docs/DESIGN_HANDOFF.md)
- 개선 제안 보고서: [`docs/IMPROVEMENTS.md`](docs/IMPROVEMENTS.md)
- 작업 대기 백로그: [`docs/IMPROVEMENT_BACKLOG.md`](docs/IMPROVEMENT_BACKLOG.md)
