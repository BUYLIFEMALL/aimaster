# AI 올인원 그래픽 자동화 (allinone-graphic) — 플랫폼 공식 인수인계 매뉴얼

> **문서 버전**: 2026-10-13 공식 배포본  
> **프로그램명**: AI 올인원 그래픽 자동화  
> **식별자(Slug)**: `allinone-graphic`  
> **버전**: `v1.01`  
> **공식 서비스 URL**: https://graphic.buylife.xyz (Vercel Prod: https://allinone-graphic-ocu7nzr2f-buylife.vercel.app)  
> **카탈로그 카테고리**: 이미지 (`b5cec438-a6cc-43e5-83bc-59368f8a2c4d`)  
> **노출 순위**: 메인 카탈로그 최상단 1순위 (`sort_order: 128`)  
> **배지**: `FREE`, `NEW`  

---

## 1. 개발 배경 및 목적
19개 전문 직군 및 산업 분야(IT, 게임, 창작, 마케팅, 커머스, 교육, 의료, 인테리어 등)의 실무자가 외주 디자이너 없이 123종의 전문 프리셋과 나노바나나(Nano Banana / Nano Banana2 Pro) 초고해상도 AI 렌더링 엔진, 브러시 인페인팅/아웃페인팅 스마트 에디터를 활용하여 상업용 디자인 에셋을 1분 만에 일괄 완성하는 올인원 스튜디오 구축.

---

## 2. 핵심 기능 및 아키텍처

1. **19개 직군 123종 전문 프리셋 전수 내장**:
   - `src/lib/templates.ts`에 123개 템플릿의 가변 필드(`fields`), 💡 활용 팁 & 레퍼런스 가이드(`usage`), 기본 스타일(`defaultStyle`)을 100% 완전 탑재.
2. **AI 입력 도우미: 기획서 분석 자동 입력**:
   - 사용자가 회의록이나 기획서 문서(.txt, .md, .json, .pdf)를 첨부하고 `[AI 자동 입력]`을 누르면 Gemini 2.5 Flash가 기획서를 분석하여 템플릿의 가변 필드를 자동 추출하여 폼에 자동 채움.
3. **나노바나나 엔진 & 멀티모달 참조**:
   - ⚡ **나노바나나 (표준 1K)**: 빠른 아이디어 스케치 (`gemini-2.5-flash-image`)
   - ✨ **나노바나나2 (Pro 2K/4K)**: 고해상도 질감, 매크로 접사, 텍스트 렌더링 (`gemini-3.1-flash-image-preview`)
   - `피사체 유지(maintainSubject)` 토글: 얼굴/외형 엄격 유지 vs 스타일/무드 참고.
4. **스마트 매직 에디터 (인페인팅 & 아웃페인팅)**:
   - 브라우저 Canvas에서 브러시 크기를 조절하여 수정할 영역을 마스킹하고 프롬프트를 전송하면 해당 영역만 정밀 교체/추가/삭제.
   - 비율 변경 시 피사체를 중앙에 보존하고 빈 배경을 자연 연장하는 아웃페인팅 지원.
5. **보안 및 API 키 연동 (최상위 절대 규칙)**:
   - 회원 본인의 Google Gemini API 키 연동 필수 (`user_api_keys.provider = 'gemini'`).
   - 운영자 키 폴백 원천 배제.

---

## 3. DB 등록 및 연동 현황

- **`programs`**:
  - `id`: `6fc5e240-9e72-45b2-90aa-b259e74ddd03`
  - `slug`: `allinone-graphic`
  - `name`: `AI 올인원 그래픽 자동화`
  - `category_id`: `b5cec438-a6cc-43e5-83bc-59368f8a2c4d` (이미지)
  - `sort_order`: 128
  - `thumbnail_url`: `https://esgxyikcnnvmlhygjkth.supabase.co/storage/v1/object/public/program-images/catalog/allinone-graphic-thumbnail.jpg?v=1791830338797`
  - `app_url`: `https://graphic.buylife.xyz`
  - `version`: `v1.01`
- **`pricing_plans`**: 1개월 1만, 2개월 2만, 3개월 3만 3종 완비
- **`platform_guides`**: `allinone-graphic-guide` 상세 가이드 등록 완료
