# fashion-style (AI 패션스타일 자동화)

> **공식 서비스 URL**: [https://fashion-style.buylife.xyz](https://fashion-style.buylife.xyz)  
> **현재 버전**: `v1.10` (2026-10-18)  
> **디자인 템플릿**: **크리에이티브 아틀리에 스타일 — 패션 매거진 미드나잇 변형 (Creative Atelier Style — Fashion Magazine Midnight Edition)**  
> **관리/인수인계 규격서**: [AGENTS.md](AGENTS.md)

---

## 👗 개요
AI 패션스타일 자동화는 업로드한 인물 사진에 TPO 상황별 의상/소품을 가상으로 입혀보고(Virtual Try-On), 메이크업 및 헤어 뷰티 분석까지 완성하는 프리미엄 퍼스널 스타일링 스튜디오입니다.

## 🌟 주요 기능
1. **상황별 코디 추천**: TPO 입력 시 의상 2세트 및 액세서리 자동 이미지 생성.
2. **드래그앤드롭 가상 착용**: 인물 사진 위로 옷을 끌어다 놓아 즉시 피팅.
3. **나만의 옷장**: 쇼핑몰 이미지 파일, 붙여넣기(Ctrl+V), 웹 주소로 옷 보관.
4. **Before/After 비교 슬라이더**: 원본과 피팅 결과의 실시간 스와이프 비교.
5. **AI 뷰티 스튜디오**: 의상 어울림 메이크업/헤어 분석 및 스타일링 조언.
6. **비주얼 에디토리얼 가이드북 (`/guide`)**: 3-Step 스튜디오 파이프라인, 코디 칩 4종, FAQ 7종 아코디언.

## 🛠️ 기술 스택
- **Framework**: Next.js 16.4.0 (Turbopack), React 19.3.0
- **Language**: TypeScript 5.9.3
- **AI**: `@google/genai` 1.21.0 (Gemini 2.5 Flash / Flash Lite)
- **DB/Auth**: Supabase SSR (`@supabase/ssr`, `@supabase/supabase-js`)
- **Storage**: IndexedDB (`idb`) 회원별 로컬 옷장 보관
- **UI Icons**: `lucide-react` 1.48.0
