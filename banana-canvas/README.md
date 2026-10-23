# AI 바나나 캔버스 자동화 (`banana-canvas`)

> **공식 서비스 URL**: https://banana-canvas.buylife.xyz  
> **현재 버전**: `v1.08` (2026-10-18 디자인 전면 리뉴얼 및 가이드북 신설)  
> **공식 디자인 템플릿**: **크리에이티브 아틀리에 스타일 — 바나나 팝 차콜 변형 (Creative Atelier Style — Banana Pop Charcoal Edition)**

---

## 1. 개요
사진 한 장(또는 텍스트 아이디어)으로 이미지 생성, 복원/컬러화/업스케일, 5장 멀티 합성, 배경 제거, 부분 삭제, 증명사진, 3D 평면도, 인생 앨범, 만화 패널, 8컷 연속 스토리까지 브라우저 한 화면 대시보드에서 완결 짓는 올인원 이미지 창작 작업실입니다.

---

## 2. 주요 기능
- **3열 올인원 대시보드 (`/studio`)**:
  - 1열: 원본 이미지 업로드 및 AI 생성, 빠른 작업, 연속 스토리/레시피
  - 2열: 정밀 편집(20종 스타일), 멀티 소스 합성, 인생 앨범, 만화 패널
  - 3열: 실시간 결과 고정 프리뷰 및 "이 결과로 계속 편집"
- **빠른 작업 지도 칩 띠 (`.bc-nav-chips`)**:
  - 상단 원터치 앵커 네비게이션으로 원하는 작업 카드로 즉시 스크롤 이동
- **비주얼 연동 & 사용 매뉴얼 (`/guide`)**:
  - 바나나 캐릭터 배지 히어로 배너, 3단계 워크플로우 비주얼, 20종 스타일 프리셋 칩, FAQ 6종 아코디언
- **내 결과 기록 (`/history`)**:
  - 회원별 최근 30건 작업 결과 격리 보관 및 즐겨찾기

---

## 3. 기술 스택
- Next.js 16.4.0 (Turbopack, App Router, React 19)
- CSS Variables 기반 단일 테마 토큰 시스템 (바나나 팝 차콜 팔레트)
- Sharp (Lanczos3 업스케일, 가장자리 기반 크로마키 알파 추출)
- Google Gemini / Nano Banana (`gemini-nano-banana-2.1`, `gemini-3-pro-image`)
- Supabase Database & Private Storage
- Vercel Serverless Functions (`--scope buylife`)
- Microsoft Edge 포그라운드 자동화 검수 (Playwright)

---

## 4. 인수인계 문서 링크
- 개발 완료 보고서: [`docs/DESIGN_HANDOFF.md`](docs/DESIGN_HANDOFF.md)
- 개선사항 및 고도화 제안: [`docs/IMPROVEMENTS.md`](docs/IMPROVEMENTS.md)
- 작업 대기 백로그: [`docs/IMPROVEMENT_BACKLOG.md`](docs/IMPROVEMENT_BACKLOG.md)
- 사전 개발 플랜: [`docs/PLAN_20261018_DESIGN_RENEWAL.md`](docs/PLAN_20261018_DESIGN_RENEWAL.md)
- 상세 기술 지침: [`AGENTS.md`](AGENTS.md)
