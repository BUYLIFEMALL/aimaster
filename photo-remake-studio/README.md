# photo-remake-studio (AI 포토 리메이크 자동화)

> **공식 서비스 URL**: [https://photo-remake-studio.buylife.xyz](https://photo-remake-studio.buylife.xyz)  
> **현재 버전**: `v1.09` (2026-10-18)  
> **디자인 템플릿**: **크리에이티브 아틀리에 스타일 — 포토 리메이크 옵시디언 변형 (Creative Atelier Style — Photo Remake Obsidian Edition)**  
> **관리/인수인계 규격서**: [AGENTS.md](AGENTS.md)

---

## 🪄 개요
AI 포토 리메이크 자동화는 손상된 옛날 흑백 사진의 흠집·노이즈 복원, AI 컬러화, 최대 8,192px 초해상도 확대, 정교한 다중 사물 합성을 원스톱으로 지원하는 AI 사진 복원 및 연출 연구소 스튜디오입니다.

## 🌟 주요 기능
1. **AI 사진 복원**: 흠집, 찢김, 빛바램, 노이즈를 AI가 원본 인물과 구도를 보존하며 정교하게 복원.
2. **AI 흑백 컬러화**: 흑백 사진의 시대적 배경을 추론하여 자연스러운 색상 채색.
3. **초해상도 픽셀 확대 (Upscale)**: 복원 결과를 2배/4배(최대 8,192px)로 고해상도 확대.
4. **Before/After 비교 슬라이더**: 원본과 복원 결과물을 드래그 슬라이더로 직관적 비교.
5. **다중 사물 자연 합성**: 사물 사진 최대 5장을 추가하여 장면 연출 합성.
6. **내 보관함**: 브라우저 로컬 스토리지에 완성작 최대 20개 안전 보관.
7. **비주얼 에디토리얼 가이드북 (`/guide`)**: 3-Step 파이프라인, 복원 칩 4종, FAQ 6종 아코디언 탑재.

## 🛠️ 기술 스택
- **Framework**: Next.js 16.4.0 (Turbopack), React 19.3.0
- **Language**: TypeScript 5.9.3
- **Image Processing**: `sharp` 0.35.5
- **AI**: Google Gemini API (`gemini-2.5-flash` / `gemini-nano-banana-2.1`)
- **DB/Auth**: Supabase SSR (`@supabase/ssr`, `@supabase/supabase-js`)
- **UI Icons**: `lucide-react` 1.48.0
