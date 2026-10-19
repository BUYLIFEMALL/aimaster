# AIMaster 종합 이용 가이드(/guides) 전면 리뉴얼 인수인계 문서

> **작성 일시:** 2026-10-19  
> **작성자:** Antigravity CLI (agy)  
> **대상 플랫폼:** AIMaster 메인 포털 (`https://www.buylife.xyz/guides` 및 `/guides/[id]`)  
> **작업 배경:** 주인님의 지시("지금보다 보다 자세하게 단계별로, 시각적으로 가독성 있게 내용에 어울리는 이모티콘 사용, 각각 서브프로그램의 사용법·매뉴얼 페이지 참고")를 바탕으로, 단순한 텍스트 나열이었던 가이드 메뉴를 **API 연동 가이드와 서브프로그램 실전 매뉴얼이 결합된 프리미엄 듀얼 트랙 가이드북**으로 전면 리뉴얼 완료.

---

## 1. 주요 작업 및 개편 내역

### 🚀 1. 듀얼 트랙(Dual Track) 가이드북 체계 구축 ([`GuideHub.tsx`](file:///D:/Antigravity/AIMaster/components/guides/GuideHub.tsx))
- **`[🔑 API · 플랫폼 연동 가이드 (40)]`**:
  - OpenAI, Google Gemini, Anthropic Claude, Meta(인스타/쓰레드), Naver, Kakao, Coupang 등 40대 외부 플랫폼 API 발급 및 연동 가이드.
  - 가이드 카드마다 **플랫폼 전용 이모티콘(🤖, 💎, 🧠, 📸, 💬 등)**, **예상 소요 시간(⏱️ 3분)**, **난이도 뱃지(🟢 초급 / 🟡 중급 / 🔴 고급)**, **핵심 요약 한 줄**, **`[공식 콘솔 ↗]`** 직링크 탑재.
- **`[🚀 서브프로그램 실전 매뉴얼 (82)]`**:
  - 82개 마케팅 자동화 솔루션의 실제 화면 구성, 3단 레이아웃, 단계별 워크플로우를 진열.
  - 디자인 템플릿 태그, `[기능 상세]` 매뉴얼 링크 및 `[▶ 즉시 실행]` CTA 버튼 탑재.

---

### 🔍 2. 초고속 실시간 검색 & 카테고리 칩셋 엔진
- 키워드(API명, 프로그램명, 플랫폼 영문 slug, 한 줄 설명) 입력 시 0.05초 만에 즉시 반응하는 인메모리 라이브 검색.
- 어느 카테고리가 선택되어 있든 검색어 입력 시 전역 검색이 우선 적용되어 오검색 방지.
- 7대 퀵 칩셋 지원: `전체` · `🤖 LLM AI` · `📸 SNS` · `🟢 네이버` · `🛍️ 이커머스` · `🎨 이미지/영상` · `💬 메신저/알림`.

---

### 📖 3. 단계별 상세 가이드 뷰어 고도화 ([`guides/[id]/page.tsx`](file:///D:/Antigravity/AIMaster/app/(main)/guides/[id]/page.tsx))
- **상단 헤더**: 뒤로가기 버튼, 대표 이모티콘, 소요 시간, 난이도 뱃지, **`[공식 콘솔 바로가기 ↗]`** 원클릭 링크.
- **최상위 보안 격리 배너**: 개인 API 키 100% 독립 분리 보관 원칙 안내.
- **본문 구조화**: 밋밋한 텍스트를 `시작하기 전에` → `Step 1 ~ Step 4 단계별 스텝 카드` → `💡 팁` → `⚠️ 보안 주의사항`으로 전면 재구성 (OpenAI, Gemini 우선 고도화 완료).
- **연관 가이드 추천**: 본문 하단에 동일 카테고리의 연관 가이드 3개를 자동 추천.
- **내 계정 키 등록 바로가기**: 하단에 `[API키 등록하러 가기 →]` 링크 제공.

---

## 2. 검수 증적 및 관련 문서

| 구분 | 파일 및 링크 |
|---|---|
| **운영 사이트 링크** | https://www.buylife.xyz/guides |
| **API 가이드 탭 기본 화면** | [edge_guides_api_tab.png](file:///C:/Users/Administrator/.gemini/antigravity-cli/brain/3a7fab5b-023b-4b09-81e4-11e7ec517fc9/edge_guides_api_tab.png) |
| **SNS 카테고리 필터링** | [edge_guides_sns_filter.png](file:///C:/Users/Administrator/.gemini/antigravity-cli/brain/3a7fab5b-023b-4b09-81e4-11e7ec517fc9/edge_guides_sns_filter.png) |
| **실시간 검색 결과** | [edge_guides_search.png](file:///C:/Users/Administrator/.gemini/antigravity-cli/brain/3a7fab5b-023b-4b09-81e4-11e7ec517fc9/edge_guides_search.png) |
| **서브프로그램 매뉴얼 탭** | [edge_guides_programs_tab.png](file:///C:/Users/Administrator/.gemini/antigravity-cli/brain/3a7fab5b-023b-4b09-81e4-11e7ec517fc9/edge_guides_programs_tab.png) |
| **단계별 상세 가이드 화면** | [edge_guide_detail_step_by_step.png](file:///C:/Users/Administrator/.gemini/antigravity-cli/brain/3a7fab5b-023b-4b09-81e4-11e7ec517fc9/edge_guide_detail_step_by_step.png) |

---

## 3. 향후 추가 보강 가능 항목
- 나머지 API 가이드(Claude, 네이버, 유튜브, 카카오, 쿠팡 등)도 OpenAI/Gemini와 동일한 스텝별 비주얼 형식으로 순차 확장.
- 서브프로그램의 `UsageGuide.tsx` 본문 전문을 가이드 상세 페이지에도 다이렉트 탭으로 연계.
