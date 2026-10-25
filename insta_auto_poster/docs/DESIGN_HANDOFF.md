# INSTA 포스팅 자동화 (auto-instagram-posting) 디자인 & 기능 리뉴얼 인수인계 (v1.70)

> **일시**: 2026-10-25
> **버전**: `v1.70` (이전 v1.69)
> **서비스 주소**: https://auto-instagram-posting.buylife.xyz
> **Vercel 프로덕션**: `https://insta-auto-poster-b581etk0a-buylife.vercel.app`

---

## 1. 디자인 템플릿 3대 기준 명시 (DESIGN.md 원칙 22 준수)
1. **어떤 템플릿인가**: `인스타 바이럴 스튜디오 스타일 (Instagram Viral Studio Style)`
2. **어떤 스타일인가**: 인스타그램 고유의 선셋 핑크/퍼플/오렌지(`from-fuchsia-600 via-pink-600 to-rose-500`) 시그니처 그라데이션, 다크 슬레이트 베이스(`bg-slate-900`/`bg-slate-950`), 물리적 4px 키캡 푸시 모션의 3D 엠보싱 버튼 세트(`.btn-3d-primary`, `.btn-3d-emerald`, `.btn-3d-amber`, `.btn-create-key`, `.btn-platform-signup`).
3. **왜 이 프로그램에 적용되어 있는가 (선정 이유)**: 인스타그램 피드 및 카드뉴스 제작은 감각적이고 트렌디한 비주얼이 최우선이므로, 인스타그램 브랜드 아이덴티티와 일치하는 선셋 네온 감성을 극대화하여 크리에이터의 몰입도를 높이고, 외부 AI 및 스톡 이미지 API 연동을 직관적으로 완료할 수 있도록 구성함.

---

## 2. v1.70 주요 변경 사항
1. **7대 플랫폼 공식 키발급 2단 퀵액션 버튼 세트 탑재**:
   - `ApiKeyRow.tsx` 컴포넌트에 OpenAI, Anthropic Claude, Google Gemini, Perplexity, Apify, Pixabay, Pexels 및 Meta/Facebook 공식 키 발급 바로가기(`.btn-create-key`)와 가입 바로가기(`.btn-platform-signup`) 전면 적용.
   - 키 저장 버튼의 물리적 3D 엠보싱(`.btn-3d-primary`) 표준화.
2. **글로벌 3D 엠보싱 버튼 규격화**:
   - `globals.css`에 2단 수직 그라데이션, `box-shadow: 0 5px 0 ...`, hover 시 부유(-1.5px), active 시 4px 눌림 모션 완벽 구현.
3. **가이드(`/guide`) 및 카드뉴스 스튜디오(`/cardnews`) 3D 액션 버튼 반영**:
   - 상단 히어로 배너에 3D 새 포스팅 바로가기 버튼 탑재.
4. **네이버 웨일(Whale) 실제 창(1440x900) 실세션 검수 완료**.
