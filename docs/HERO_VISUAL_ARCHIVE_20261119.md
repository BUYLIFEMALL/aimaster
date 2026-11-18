# AI Master 메인 히어로 섹션 실사 비주얼 아카이브 (1차 작업분)

> **작성일**: 2026-11-19  
> **담당**: Antigravity CLI (AGY) `[role: design]`  
> **상태**: 자료화 보관 완료 (2차 신규 3안 재작업 진행)

---

## 1. 1차 작업 개요
메인 사이트(`https://www.buylife.xyz`) 상단 히어로 섹션(`components/home/HeroShowcase.tsx`)에 적용했던 1차 실사 비주얼 3종 및 인터랙티브 쇼케이스 UI 구현 내역을 아카이브합니다.

- **구현 커밋**: `1edd6f67c` (`feat(home): upgrade hero section to photorealistic interactive visual showcase`)
- **컴포넌트 경로**: `components/home/HeroShowcase.tsx`
- **로컬 빌드 검증**: `npx tsc --noEmit` 0 에러, `npm run build` 77/77 페이지 정상 생성 확인

---

## 2. 1차 실사 이미지 3종 목록

| 구분 | 제목 | 이미지 경로 | 특징 및 무드 |
| :--- | :--- | :--- | :--- |
| **1차-1안** | 스마트 AI Ops 워크스페이스 | `public/images/hero/concept_1_smart_ops.jpg` | 석양 도심 스카이라인 오피스, 투명 골드 홀로그램 대시보드 |
| **1차-2안** | 인간-AI 신경망 협업 | `public/images/hero/concept_2_neural_flow.jpg` | 모던 스튜디오 노트북과 주변을 감싸는 황금빛 데이터 신경망 |
| **1차-3안** | 24/7 무인 자율 비즈니스 센터 | `public/images/hero/concept_3_command_hub.jpg` | 다크 슬레이트 관제실의 와이드 커브드 멀티 디스플레이 |

---

## 3. 향후 재활용 가이드
위 3종 이미지는 `public/images/hero/` 경로에 보존되어 있으며, 향후 서브 페이지(예: `/packages`, `/custom`, `/revenue-share`)나 마케팅 랜딩 섹션 배너 이미지로 즉시 재활용 가능합니다.
