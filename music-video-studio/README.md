# 뮤직비디오 자동화 (music-video-studio)

> **공식 서비스 URL**: https://music-video-studio.buylife.xyz  
> **현재 버전**: `v1.11` (사이버 네온 다크 콘솔 스타일 — 뮤직비디오 앰프 데크 에디션)

---

## 1. 개요 및 목적
- AI 작곡(Suno/Udio) 음원에 맞춰 가사 기획부터 스토리보드 분할, Gemini 나노바나나 고화질 이미지 생성, Google Veo 3.1 비디오 렌더링 및 8초 심리스 루프(Seamless Loop) 영상 생성까지 원스톱으로 지원하는 AI 뮤직비디오 프로덕션 자동화 플랫폼.
- 유튜브 쇼츠, 인스타그램 릴스, 틱톡 등에 특화된 세로형(9:16) 및 가로형(16:9) 고화질 음악 배경 영상을 손쉽게 양산할 수 있습니다.

---

## 2. 주요 기능 및 4단계 파이프라인
1. **1단계: 음악 & 가사 기획 (`/music`)**: 장르, 무드, 보컬 프리셋 설정, 완성형 가사 자동 생성, Suno 음악 프롬프트 추출.
2. **2단계: AI 스토리보드 분할 (`/storyboard`)**: 가사를 타임라인 씬(Scene)으로 분할, 장면별 카메라 앵글 및 비주얼 프롬프트 자동 작성.
3. **3단계: 고화질 장면 렌더링 (`/scenes`)**: Gemini 나노바나나 씬 이미지 생성, Google Veo 3.1 비디오 모션 렌더링, ZIP 패키징 다운로드.
4. **연동 & 비주얼 매뉴얼 (`/guide`, `/settings`)**: 4단계 워크플로우 가이드, Suno/Veo 노하우, FAQ, 본인 Gemini API 키 암호화 관리.

---

## 3. UI/UX 디자인 시스템
- **공식 테마**: **사이버 네온 다크 콘솔 스타일 — 뮤직비디오 앰프 데크 에디션**
- **색상 팔레트**: 퓨어 딥 블랙(`#060911`), 네온 다크 콘솔(`#0a0f1d`), 네온 시안(`#00f2fe`), 네온 핑크/마젠타(`#f43f5e`, `#ec4899`).
- **모바일 반응형**: 375px 모바일 56px 슬림 네온 헤더 + 슬라이딩 드로어 메뉴 완비.

---

## 4. 인수인계 문서 및 히스토리
- 상세 기술 스펙 및 인수인계: [`AGENTS.md`](./AGENTS.md)
- 디자인 개발완료 보고서: [`docs/DESIGN_HANDOFF.md`](./docs/DESIGN_HANDOFF.md)
- 개선사항 및 고도화 제안: [`docs/IMPROVEMENTS.md`](./docs/IMPROVEMENTS.md)
- 작업 대기 백로그: [`docs/IMPROVEMENT_BACKLOG.md`](./docs/IMPROVEMENT_BACKLOG.md)
- 사전 개발 플랜: [`docs/PLAN_20261018_DESIGN_RENEWAL.md`](./docs/PLAN_20261018_DESIGN_RENEWAL.md)
