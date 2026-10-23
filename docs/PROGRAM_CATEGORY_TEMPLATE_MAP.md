# AIMaster 카테고리별 프로그램 디자인 템플릿 총람 및 선정 가이드 (PROGRAM_CATEGORY_TEMPLATE_MAP.md)

> **최초 제정**: 2026-10-19 (주인님 지시)
> **문서 목적**: AIMaster 전체 84개 프로그램(새로 추가된 `ai-doc-chatbot` 등 포함)을 **공식 14개 카테고리(분야) 기준으로 완전 분류**하고, 각 프로그램에 적용된 **디자인 템플릿 스타일과 그 템플릿을 선정한 명확한 UX/기능적 이유(Why?)**를 체계적으로 정리하여 **모든 AI CLI(Claude Code, Codex, Antigravity 등)가 향후 개발·개선·리뉴얼 시 나침반으로 상호 참조**할 수 있도록 영구 표준 문서로 제공합니다.
> **연계 문서**: [`DESIGN.md`](../DESIGN.md) (메인 지침), [`docs/DESIGN_TEMPLATE_CATALOG.md`](DESIGN_TEMPLATE_CATALOG.md) (스타일별 카탈로그), [`docs/PROGRAM_CAPABILITY_MAP.md`](PROGRAM_CAPABILITY_MAP.md) (기능 역량 지도)

---

## 📊 카테고리별 총괄 진척 현황 요약

| 번호 | 공식 카테고리명 | 총 프로그램 수 | ✅ 작업 완료 | ⏸️ 보류 | 완료율 (%) | 대표 핵심 디자인 템플릿 스타일 |
|:---:|---|:---:|:---:|:---:|:---:|---|
| 1 | **데이터수집·기획** | 12개 | 12개 | - | **100.0%** | 포커스 스튜디오 & 플로우 위저드 & 캔버스 |
| 2 | **블로그** | 7개 | 7개 | - | **100.0%** | 플로우 위저드 & 포커스 스튜디오 |
| 3 | **유튜브** | 9개 | 9개 | - | **100.0%** | 유튜브 다크 콘솔 & 플로우 위저드 |
| 4 | **이미지** | 10개 | 10개 | - | **100.0%** | 크리에이티브 아틀리에 (다양한 변형) |
| 5 | **음악** | 7개 | 7개 | - | **100.0%** | 사이버 네온 콘솔 & 사이버 수노 다크 |
| 6 | **이커머스** | 5개 | 5개 | - | **100.0%** | 이커머스 셀러 스튜디오 & 포커스 스튜디오 |
| 7 | **인스타** | 6개 | 6개 | - | **100.0%** | 크리에이티브 아틀리에 & 댓글 콘솔 |
| 8 | **쓰레드** | 5개 | 5개 | - | **100.0%** | 스레드 바이럴 스튜디오 |
| 9 | **Tools** | 9개 | 9개 | - | **100.0%** | 포커스 스튜디오 & 아틀리에 파스텔 |
| 10 | **네이버** | 4개 | 2개 | 2개 | **50.0%** | 플로우 위저드 & 스마트 매트릭스 (그린) |
| 11 | **CRM** | 2개 | 2개 | - | **100.0%** | 플로우 위저드 & 스마트 매트릭스 |
| 12 | **마케팅(홍보)** | 4개 | 4개 | - | **100.0%** | 스마트 매트릭스 & 플로우 위저드 |
| 13 | **멀티미디어** | 3개 | 3개 | - | **100.0%** | 사이버 네온 콘솔 & 크리에이티브 아틀리에 |
| 14 | **부동산** | 1개 | 1개 | - | **100.0%** | 스마트 매트릭스 다크 슬레이트 |
| **합계** | **전체 14개 카테고리** | **84개** | **82개** | **2개** | **97.6%** | **정상 운영 82개 100% 전수 완료!** |

---

## 🎨 8대 주요 디자인 템플릿의 핵심 철학 및 적용 기준

다른 CLI가 특정 기능을 개선하거나 신규 프로그램을 설계할 때, 아래 8대 템플릿의 핵심 철학과 목적을 기준으로 최적의 스타일을 선택합니다:

1. **포커스 스튜디오 스타일 (Focus Studio)**
   - **핵심 목적**: 텍스트 집필, 마크다운 문서, 번역 대조, 챗봇 대화 등 텍스트 중심 인터랙션의 집중력 극대화.
   - **선정 기준**: 사용자가 텍스트를 장시간 읽거나 작성해야 하는 경우, 좌우 스플릿 뷰(원문 vs 결과) 및 페이퍼/소프트 크림 질감 적용.

2. **사이버 네온 다크 콘솔 스타일 (Cyber Neon Dark Console)**
   - **핵심 목적**: 오디오 파형, 이퀄라이저, 마스터링 데크, 음악 플레이어 등 프로 미디어 하이테크 감성 제공.
   - **선정 기준**: 음악/오디오 조작 컴포넌트(슬라이더, 노브, 스펙트럼)가 핵심이며 암실 프로 스튜디오 분위기가 요구되는 경우.

3. **플로우 위저드 스타일 (Flow Wizard)**
   - **핵심 목적**: 1-2-3-4 단계별 순차 진행을 통한 초보자 사용성 보장 및 복잡한 AI 파이프라인의 명확한 상태 안내.
   - **선정 기준**: [글감 수집 ➔ AI 초안 ➔ 삽화 생성 ➔ 검수 발행] 등 순서가 엄격히 정해진 원스톱 자동화 도구.

4. **스마트 매트릭스 스타일 (Smart Matrix)**
   - **핵심 목적**: 대량의 정량적 데이터(키워드, 크롤링 결과, 실거래가, 생산성 지표)를 한눈에 조망하고 고속 필터링.
   - **선정 기준**: 상단 3~4종 KPI 통계 카드와 다열 데이터 테이블/그리드 전환 뷰가 데이터 분석의 핵심인 경우.

5. **크리에이티브 아틀리에 스타일 (Creative Atelier)**
   - **핵심 목적**: 대형 뷰포트 캔버스, 프리셋 갤러리 칩셋, 비주얼 일러스트 생성을 위한 아티스틱 작업실 환경 제공.
   - **선정 기준**: 이미지 생성, 썸네일 디자인, 웹툰/만화, 패션 피팅, 타로/MBTI 등 시각적 캔버스 중심 도구.

6. **유튜브 다크 콘솔 스타일 (YouTube Dark Console)**
   - **핵심 목적**: 유튜브 공식 플랫폼과의 완벽한 시각적 일체감(옵시디언 블랙 & 레드 포인트) 및 16:9 비디오 제어.
   - **선정 기준**: 유튜브 영상 렌더링, 채널 분석, 떡상 탐색기, 유튜브 댓글 자동화 도구.

7. **이커머스 셀러 스튜디오 스타일 (E-commerce Seller Studio)**
   - **핵심 목적**: 네이버 스마트스토어/쿠팡 셀러센터 감성의 신뢰감 있는 화이트/로열블루 서식 및 롱 이미지 병합.
   - **선정 기준**: 쇼핑몰 상품 상세페이지 12~15단 기획, 상품 소싱, 이커머스 전용 콘텐츠 제작 도구.

8. **스레드 바이럴 스튜디오 스타일 (Threads Viral Studio)**
   - **핵심 목적**: Meta Threads 공식 미니멀 감성, 500자 글자수 제약, 6종 페르소나 카드 갤러리 제공.
   - **선정 기준**: Threads 계정 운영, 바이럴 기획, 제휴 마케팅 자동 포스팅 도구.

---

## 📋 카테고리별 프로그램 전수 상세 대조표 (84개 전원)

### 1. [데이터수집·기획] 카테고리 (12개 프로그램)

| No | 프로그램명 | slug | 버전 | 서비스 링크 | 적용 디자인 템플릿 | 배경 테마 | 템플릿 선정 이유 및 UX/기능적 근거 (Why?) |
|:---:|---|---|:---:|---|---|---|---|
| **1** | **마크다운 문서 자동화** | `markdown-studio` | `v1.20` | [https://markdown-studio.buylife.xyz](https://markdown-studio.buylife.xyz) | **포커스 스튜디오 스타일** | 라이트(크림) | 마크다운 원문 편집과 실시간 렌더링을 좌우 2열로 분할하여 문서 집필의 가독성과 집중도를 극대화하기 위해 포커스 스튜디오 채택. |
| **7** | **시네마틱 스토리보드 자동화** | `cinematic-storyboard-studio` | `v1.09` | [https://cinematic-storyboard.buylife.xyz](https://cinematic-storyboard.buylife.xyz) | **크리에이티브 아틀리에 스타일 (시네마틱 아틀리에)** | 다크(시네마틱 차콜 `#0b0f17`) | 9컷 시네마틱 장면 구성과 영상 프롬프트 설계를 영화 제작 데스크처럼 조망할 수 있도록 시네마틱 아틀리에 다크 스타일 채택. |
| **9** | **AI 프롬프트 템플릿 자동화** | `prompt-template-studio` | `v1.03` | [https://prompt-template.buylife.xyz](https://prompt-template.buylife.xyz) | **포커스 스튜디오 스타일 (프롬프트 템플릿 스튜디오)** | 라이트(클린 슬레이트 `#f8fafc`) | 자주 쓰는 프롬프트 템플릿의 변수 치환과 결과 테스트를 한 화면에서 집중적으로 다루기 위해 클린 슬레이트 포커스 스튜디오 채택. |
| **10** | **페르소나 문체 자동화** | `persona-style-studio` | `v1.06` | [https://persona-style-studio.buylife.xyz](https://persona-style-studio.buylife.xyz) | **포커스 스튜디오 스타일 (문체 변환 스튜디오)** | 라이트(클린 슬레이트 `#f8fafc`) | 원문과 변환된 페르소나 문체 결과를 좌우로 대조하며 미세 톤 조절 슬라이더를 조작하기 위해 포커스 스튜디오 채택. |
| **11** | **AI Prompt 자동화** | `ai-prompt-studio` | `v1.04` | [https://ai-prompt.buylife.xyz](https://ai-prompt.buylife.xyz) | **포커스 스튜디오 스타일 (프롬프트 엔지니어링 스튜디오)** | 라이트(클린 슬레이트 `#f8fafc`) | 프롬프트 엔지니어링 구조화, 시스템 메시지 설계, LLM별 파라미터 튜닝을 집중 집필할 수 있도록 포커스 스튜디오 채택. |
| **21** | **Website Scraper** | `website-scraper` | `v1.12` | [https://website-scraper.buylife.xyz](https://website-scraper.buylife.xyz) | **스마트 매트릭스 스타일 (Tailwind v4 이식)** | 다크(차콜 `#0f1115` + 블루 `#2563eb`·앰버 `#f59e0b`) | 수천 건의 웹 스크래핑 데이터 필터링, 정렬, CSV 추출을 한눈에 조망할 수 있도록 고성능 데이터 그리드 기반 스마트 매트릭스 채택. |
| **42** | **웹 크롤링 자동화** | `web-crawler-saas` | `v1.08` | [https://web-crawler-saas.buylife.xyz](https://web-crawler-saas.buylife.xyz) | **스마트 매트릭스 스타일 (다크 슬레이트, Tailwind v4)** | 다크(차콜 `#0f1115` + 블루 `#2563eb`·앰버 `#f59e0b`) | 사이트 계층 구조 탐색 및 다차원 웹 데이터 추출 결과를 직관적인 테이블로 모니터링하기 위해 스마트 매트릭스 다크 슬레이트 채택. |
| **68** | **AI 글쓰기 에디터 자동화** | `ai-writing-editor` | `v1.07` | [https://ai-writing-editor.buylife.xyz](https://ai-writing-editor.buylife.xyz) | **포커스 스튜디오 스타일 — 글쓰기 에디터 에디션** | 라이트(소프트 크림 `#fdfbf7` + 딥 인디고 `#4f46e5`) | 장문 기사, 에세이, 보고서 등 다양한 문서를 서식 툴바와 함께 드래그 AI 교정으로 작성할 수 있도록 소프트 크림 글쓰기 포커스 스튜디오 채택. |
| **69** | **AI 랜딩페이지 기획 자동화** | `landing-architect` | `v1.06` | [https://landing-architect.buylife.xyz](https://landing-architect.buylife.xyz) | **플로우 위저드 스타일 — 단계별 랜딩페이지 기획 에디션** | 라이트(소프트 슬레이트 `#f8fafc` + 인디고 블루 `#2563eb`) | 헤드카피, 문제제기, 해결책, 소셜프루프 등 전환율 높은 랜딩페이지 6단계 구조를 위저드 폼으로 완성하기 위해 플로우 위저드 채택. |
| **70** | **UI Canvas 자동화** | `ui-canvas` | `v1.07` | [https://ui-canvas.buylife.xyz](https://ui-canvas.buylife.xyz) | **크리에이티브 아틀리에 스타일 — 캔버스 프로 에디션** | 다크(미드나잇 다크 네이비 `#0c0f17`) | UI 컴포넌트 드래그앤드롭 배치, 스크린샷 역분석, 와이어프레임 렌더링을 캔버스 중심으로 제어하기 위해 캔버스 프로 크리에이티브 아틀리에 채택. |
| **71** | **AI 슬라이드 자동화** | `ai-slide-builder` | `v1.07` | [https://ai-slide-builder.buylife.xyz](https://ai-slide-builder.buylife.xyz) | **플로우 위저드 스타일 — 단계별 슬라이드 기획 에디션** | 라이트(소프트 슬레이트 `#f8fafc` + 인디고 블루 `#2563eb`) | 회의록/기획서 문서를 발표용 IR 슬라이드로 장표별 재구성하고 PPTX로 내보내는 과정을 단계별로 안내하기 위해 플로우 위저드 채택. |
| **72** | **AI 웹 UI 제작 자동화** | `ai-web-ui` | `v1.04` | [https://ai-web-ui.buylife.xyz](https://ai-web-ui.buylife.xyz) | **크리에이티브 아틀리에 스타일 — 리액트 쇼케이스 변형** | 다크(미드나잇 네이비 `#0a0d14` + 리액트 사이언 `#38bdf8`·바이올렛 `#a855f7`) | 생성된 React UI 컴포넌트의 실시간 렌더링 프리뷰와 TSX 코드 복사를 직관적으로 제공하기 위해 리액트 쇼케이스 크리에이티브 아틀리에 채택. |

### 2. [블로그] 카테고리 (7개 프로그램)

| No | 프로그램명 | slug | 버전 | 서비스 링크 | 적용 디자인 템플릿 | 배경 테마 | 템플릿 선정 이유 및 UX/기능적 근거 (Why?) |
|:---:|---|---|:---:|---|---|---|---|
| **4** | **AI 블로그 작업실 자동화** | `blog-workroom` | `v1.11` | [https://blog-workroom.buylife.xyz](https://blog-workroom.buylife.xyz) | **포커스 스튜디오 스타일** | 라이트(크림/화이트) | 블로그 본문 작성, 문체 분석, 키워드 교정을 장시간 수행할 때 눈의 피로를 줄이고 집필에 몰입할 수 있도록 크림 페이퍼 테마의 포커스 스튜디오 채택. |
| **26** | **네이버 블로그 올인원 자동화** | `naver-blog-allinone` | `v1.48` | [https://naver-blog-allinone.buylife.xyz](https://naver-blog-allinone.buylife.xyz) | **플로우 위저드 스타일 (네이버 그린 라이트 변형)** | 라이트(클린 슬레이트 `#f8fafc` + 네이버 그린 `#03c75a`) | 키워드 분석 ➔ 개요 ➔ 본문 ➔ 스마트에디터 ONE 발행 4단계를 네이버 친화적으로 완주하도록 네이버 그린 라이트 플로우 위저드 채택. |
| **29** | **네이버 블로그 에이전트** | `naver-blog-agent` | `v1.93` | [https://naver-blog-agent.buylife.xyz](https://naver-blog-agent.buylife.xyz) | **플로우 위저드 스타일 (네이버 그린 라이트 변형)** | 라이트(클린 슬레이트 `#f8fafc` + 네이버 그린 `#03c75a`) | 5단계 AI 에이전트의 시장조사 및 본문·삽화 생성 파이프라인을 시각적으로 모니터링하기 위해 네이버 그린 라이트 플로우 위저드 채택. |
| **33** | **티스토리(원문)생성 자동화** | `tistory-auto-blog` | `v1.81` | [https://tistory-auto-blog.buylife.xyz](https://tistory-auto-blog.buylife.xyz) | **플로우 위저드 스타일 — 티스토리 오렌지 앰버 에디션** | 라이트(클린 슬레이트 `#f8fafc` + 티스토리 오렌지 `#f97316`) | 글감 수집부터 SEO 원문, AI 삽화, 티스토리 서식 완성까지의 흐름을 티스토리 고유 브랜드 감성으로 완주하도록 티스토리 오렌지 플로우 위저드 채택. |
| **59** | **BLOG(원문)생성 자동화** | `ai-auto-blog` | `v1.74` | [https://ai-auto-blog.buylife.xyz](https://ai-auto-blog.buylife.xyz) | **플로우 위저드 스타일 — 블로그 퍼블리싱 에디션** | 라이트/화이트 (에메랄드/인디고 액센트) | 실시간 이슈 수집부터 AI 본문 집필, 고화질 나노바나나 삽화, 브라우저 확장 원클릭 발행까지를 체계화하기 위해 블로그 퍼블리싱 플로우 위저드 채택. |
| **74** | **AI 블로그 키워드 자동화** | `blog-keyword` | `v1.05` | [https://blog-keyword.buylife.xyz](https://blog-keyword.buylife.xyz) | **스마트 매트릭스 스타일 (일반 CSS 이식)** | 다크(차콜 `#0f1115` + 블루 `#2563eb`·앰버 `#f59e0b`) | 단일 키워드에 대한 연관 검색어, 월간 검색량, 상위 문서 포화도 분석 결과를 표 형태로 조망하기 위해 스마트 매트릭스 채택. |
| **75** | **AI 블로그 콘텐츠 제작 자동화** | `blog-content-maker` | `v1.09` | [https://blog-content-maker.buylife.xyz](https://blog-content-maker.buylife.xyz) | **플로우 위저드 스타일 — 단계별 블로그 콘텐츠 에디션** | 라이트(소프트 화이트 `#f8fafc` + 인디고 블루 `#2563eb`·에메랄드 `#10b981`) | 주제 기획 ➔ 초안 작성 ➔ 삽화 생성 ➔ 검수 발행의 단계를 길을 잃지 않고 순차 실행하기 위해 단계별 블로그 콘텐츠 플로우 위저드 채택. |

### 3. [유튜브] 카테고리 (9개 프로그램)

| No | 프로그램명 | slug | 버전 | 서비스 링크 | 적용 디자인 템플릿 | 배경 테마 | 템플릿 선정 이유 및 UX/기능적 근거 (Why?) |
|:---:|---|---|:---:|---|---|---|---|
| **3** | **AI 쇼츠 원스톱 제작 자동화** | `shorts-onestop-studio` | `v1.18` | [https://shorts-onestop-studio.buylife.xyz](https://shorts-onestop-studio.buylife.xyz) | **플로우 위저드 스타일** | 다크/라이트 | 기획 ➔ 대본 ➔ 음성TTS ➔ 영상 렌더링의 4단계 복합 공정을 초보자도 막힘없이 완주하도록 단계별 스텝퍼 제공을 위해 플로우 위저드 채택. |
| **6** | **플레이리스트 채널 제작** | `playlist-channel-studio` | `v1.14` | [https://playlist-channel-studio.buylife.xyz](https://playlist-channel-studio.buylife.xyz) | **사이버 네온 다크 콘솔 스타일** | 다크(딥블랙 `#060911`) | 플레이리스트 영상 제작, 트랙 배치, 가사 동기화를 암실 스튜디오 환경에서 정밀 제어할 수 있도록 사이버 네온 다크 콘솔 채택. |
| **22** | **AI 유튜브 썸네일 프로** | `seo-thumbnail-pro` | `v1.11` | [https://seo-thumbnail-pro.buylife.xyz](https://seo-thumbnail-pro.buylife.xyz) | **크리에이티브 아틀리에 스타일 — 프로 썸네일 캔버스 변형** | 다크(미드나잇 다크 `#0c0f17` + 유튜브 레드 `#ff0000`·골드 앰버 `#f59e0b`) | 유튜브 16:9 규격 썸네일 캔버스 배치와 눈에 띄는 후킹 문구 배치를 직관적으로 시각화하기 위해 프로 썸네일 캔버스 아틀리에 채택. |
| **27** | **YOUTUBE CHANNEL CONSULTANT** | `youtube-channel-consultant` | `v1.09` | [https://youtube-channel-consultant.buylife.xyz](https://youtube-channel-consultant.buylife.xyz) | **유튜브 다크 콘솔 스타일 — 스튜디오 변형 (viral-studio와 동일, Tailwind v4)** | 다크(`#0f0f0f` + 유튜브 레드 `#ff0000`) | 유튜브 채널 벤치마킹, 성장 분석, 소형 고효율 채널 발굴 데이터를 유튜브 공식 테마에서 분석하기 위해 유튜브 다크 콘솔 스튜디오 변형 채택. |
| **28** | **YOUTUBE VIRAL FINDER** | `youtube-viral-studio` | `v1.18` | [https://youtube-viral-studio.buylife.xyz](https://youtube-viral-studio.buylife.xyz) | **유튜브 다크 콘솔 스타일 — 스튜디오 변형 (+ 스마트 매트릭스 구성, Tailwind v4)** | 다크(`#0f0f0f` + 유튜브 레드 `#ff0000`) | 조회수 급상승 영상, 떡상 쇼츠, 황금 채널 발굴 데이터를 지표 매트릭스와 영상 뷰어로 결합 분석하기 위해 유튜브 다크 콘솔 채택. |
| **31** | **쇼츠 떡상 분석·대본 자동화** | `shorts-viral-studio` | `v1.10` | [https://shorts-viral-studio.buylife.xyz](https://shorts-viral-studio.buylife.xyz) | **플로우 위저드 스타일 (다크 차콜 변형)** | 다크(차콜 `#0d1117` + 서피스 `#161b22` + 쇼츠 레드 `#ef4444`) | 쇼츠 떡상 공식 분해와 60초 대본 작성을 9:16 모바일 프레임과 함께 다크한 환경에서 기획하기 위해 다크 차콜 플로우 위저드 채택. |
| **48** | **유튜브 댓글자동화** | `youtube-auto-reply` | `v1.09` | [https://youtube-auto-reply.buylife.xyz](https://youtube-auto-reply.buylife.xyz) | **유튜브 다크 콘솔 스타일 — 스튜디오 댓글 콘솔 변형 (+ 스마트 매트릭스 지표 구성)** | 다크(`#0f0f0f` + 유튜브 레드 `#ff0000`) | 유튜브 채널 댓글 관리와 AI 답글 검수를 유튜브 스튜디오 관리자 화면과 일치시키기 위해 유튜브 다크 콘솔 스튜디오 댓글 변형 채택. |
| **58** | **YOUTUBE Shots 자동화** | `auto-shorts-posting` | `v1.16` | [https://auto-shorts-posting.buylife.xyz](https://auto-shorts-posting.buylife.xyz) | **유튜브 다크 콘솔 스타일 — 쇼츠 스튜디오 에디션** | 다크(옵시디언 블랙 `#0f0f0f` + 유튜브 레드 `#ff0000`) | 6장면 스토리보드 기획, AI 이미지 생성, 음원 결합 및 쇼츠 업로드 파이프라인을 유튜브 감성으로 통제하기 위해 쇼츠 스튜디오 유튜브 다크 콘솔 채택. |
| **76** | **AI 썸네일 마스터 자동화** | `thumbnail-master` | `v1.06` | [https://thumbnail-master.buylife.xyz](https://thumbnail-master.buylife.xyz) | **크리에이티브 아틀리에 스타일 — 썸네일 매거진 변형** | 다크(미드나잇 다크 `#0c0f17` + 썸네일 바이올렛 `#8b5cf6`·코랄 오렌지 `#f97316`) | 유튜브 시청 타겟 맞춤형 A/B 썸네일 전략과 시각적 후킹 구도를 매거진 형태로 디자인하기 위해 썸네일 매거진 크리에이티브 아틀리에 채택. |

### 4. [이미지] 카테고리 (10개 프로그램)

| No | 프로그램명 | slug | 버전 | 서비스 링크 | 적용 디자인 템플릿 | 배경 테마 | 템플릿 선정 이유 및 UX/기능적 근거 (Why?) |
|:---:|---|---|:---:|---|---|---|---|
| **5** | **AI 올인원 그래픽 자동화** | `allinone-graphic` | `v1.08` | [https://graphic.buylife.xyz](https://graphic.buylife.xyz) | **크리에이티브 아틀리에 스타일** | 다크(미드나잇) | 123종 그래픽 템플릿 탐색과 실시간 브러시/오버레이 편집 캔버스를 넓게 조망할 수 있도록 대형 뷰포트 중심의 크리에이티브 아틀리에 채택. |
| **17** | **이미지 변환 스튜디오** | `image-convert-studio` | `v1.08` | [https://image-convert-studio.buylife.xyz](https://image-convert-studio.buylife.xyz) | **크리에이티브 아틀리에 스타일 (이미지 스튜디오 에디션)** | 다크(딥 옵시디언 `#0b0f17` + 바이올렛 `#8b5cf6`) | 다양한 포맷(WebP/AVIF/PNG) 일괄 변환 상태와 압축률 썸네일 비교를 직관적으로 확인하기 위해 이미지 스튜디오 에디션 아틀리에 채택. |
| **19** | **감성 글귀 이미지** | `emotion-writer` | `v1.14` | [https://emotion-writer.buylife.xyz](https://emotion-writer.buylife.xyz) | **포커스 스튜디오 스타일 — 감성 캘리그라피 에디션** | 라이트(소프트 크림 `#fdfbf7` + 웜 페이퍼 & 로즈 엑센트 `#be185d`) | 감성 문구 작성과 캘리그라피 배경 사진 배치가 따뜻한 종이 감성으로 어우러지도록 소프트 크림 페이퍼 포커스 스튜디오 채택. |
| **23** | **이미지 스타일 분석기** | `style-dna-analyzer` | `v1.21` | [https://style-dna-analyzer.buylife.xyz](https://style-dna-analyzer.buylife.xyz) | **크리에이티브 아틀리에 스타일 — 스타일 DNA 랩 에디션** | 다크(미드나잇 다크 `#0c0f17` + 시안 블루 `#06b6d4`·바이올렛 `#8b5cf6`) | 이미지의 조명, 카메라 렌즈, 색감 팔레트 등 DNA 요소를 분해하고 마스터 프롬프트로 역설계하기 위해 스타일 DNA 랩 아틀리에 채택. |
| **34** | **AI 이미지 스튜디오** | `ai-image-studio` | `v1.18` | [https://ai-image-studio.buylife.xyz](https://ai-image-studio.buylife.xyz) | **크리에이티브 아틀리에 럭셔리 다크 스타일** | 다크(옵시디언 `#09090b` + 골드/앰버 `#f59e0b`) | 다양한 최신 이미지 생성 모델(Nano Banana 등)과 고화질 갤러리를 럭셔리하게 조망하는 레퍼런스 프로그램으로서 크리에이티브 아틀리에 럭셔리 다크 채택. |
| **79** | **AI 인물사진 자동화** | `portrait-photo` | `v1.29` | [https://portrait-photo.buylife.xyz](https://portrait-photo.buylife.xyz) | **크리에이티브 아틀리에 스타일 — 포토 스튜디오 그래파이트 변형** | 다크(중립 그래파이트) | 인물 사진의 미세한 피부 톤, 조명, 색감 왜곡을 방지하기 위해 중립 그래파이트 톤과 뷰파인더 뷰를 제공하는 포토 스튜디오 아틀리에 채택. |
| **80** | **AI 바나나 캔버스 자동화** | `banana-canvas` | `v1.11` | [https://banana-canvas.buylife.xyz](https://banana-canvas.buylife.xyz) | **크리에이티브 아틀리에 스타일 — 바나나 팝 차콜 변형** | 다크(따뜻한 차콜 `#16140f` + 바나나 옐로 `#ffd84d`·리프 그린 `#7ed38a`) | Nano Banana AI 기반 이미지 부분 수정, 스타일 합성, 배경 제거를 캔버스 인터랙션으로 직관 조작하기 위해 바나나 팝 차콜 아틀리에 채택. |
| **81** | **AI 4컷 만화 자동화** | `four-cut-comics` | `v1.13` | [https://four-cut-comics.buylife.xyz](https://four-cut-comics.buylife.xyz) | **크리에이티브 아틀리에 스타일 — 코믹 파스텔 변형** | 파스텔 크림 | 3·4·6컷 웹툰 및 인스타툰의 컷별 구도와 말풍선 대사 작성을 만화책 감성으로 조망하기 위해 코믹 파스텔(먹선+크림) 아틀리에 채택. |
| **82** | **AI 패션스타일 자동화** | `fashion-style` | `v1.09` | [https://fashion-style.buylife.xyz](https://fashion-style.buylife.xyz) | **크리에이티브 아틀리에 스타일 — 패션 매거진 미드나잇 변형** | 다크(미드나잇 네이비 `#0b0e17` + 로즈 골드 `#f472b6`·일렉트릭 시안 `#38bdf8`) | 사용자 사진에 AI 패션 코디, 헤어, 메이크업을 가상 피팅하고 룩북 매거진으로 비교하기 위해 패션 매거진 미드나잇 아틀리에 채택. |
| **83** | **AI 포토 리메이크 자동화** | `photo-remake-studio` | `v1.10` | [https://photo-remake-studio.buylife.xyz](https://photo-remake-studio.buylife.xyz) | **크리에이티브 아틀리에 스타일 — 포토 리메이크 옵시디언 변형** | 다크(옵시디언 딥블랙 `#090a0f` + 리메이크 앰버 `#f59e0b`·에메랄드 `#10b981`) | 오래된 흑백 사진 복원, 해상도 4K 업스케일링, 컬러 복원 전후(Before-After) 비교를 위해 포토 리메이크 옵시디언 아틀리에 채택. |

### 5. [음악] 카테고리 (7개 프로그램)

| No | 프로그램명 | slug | 버전 | 서비스 링크 | 적용 디자인 템플릿 | 배경 테마 | 템플릿 선정 이유 및 UX/기능적 근거 (Why?) |
|:---:|---|---|:---:|---|---|---|---|
| **12** | **Youtube Playlist 자동화** | `yt-playlist-studio` | `v1.14` | [https://youtube-playlist.buylife.xyz](https://youtube-playlist.buylife.xyz) | **유튜브 다크 콘솔 스타일 (YouTube Dark Console Style)** | 다크(옵시디언 블랙 `#0f0f0f` + 유튜브 레드 `#ff0000`) | 유튜브 16:9 규격 캔버스, 오디오 스펙트럼 10종, WebCodecs GPU 가속 렌더링 콘솔을 유튜브 공식 감성으로 다루기 위해 유튜브 다크 콘솔 채택. |
| **13** | **LP 턴테이블 자동화** | `vinyl-lp-studio` | `v1.12` | [https://vinyl-lp-studio.buylife.xyz](https://vinyl-lp-studio.buylife.xyz) | **크리에이티브 아틀리에 스타일 (바이닐 다크 레트로 콘솔 변형)** | 다크(옵시디언 `#0c0d12` + 바이닐 골드/앰버 `#f59e0b`) | 회전하는 턴테이블 LP판 앨범 아트 맵핑과 바이닐 스크래치 사운드 제어의 아날로그 감성을 살리기 위해 바이닐 다크 레트로 콘솔 채택. |
| **16** | **뮤직비디오 자동화** | `music-video-studio` | `v1.10` | [https://music-video-studio.buylife.xyz](https://music-video-studio.buylife.xyz) | **사이버 네온 다크 콘솔 스타일 — 뮤직비디오 앰프 데크 에디션** | 다크(딥블랙 `#060911` + 네온 시안 `#00f2fe`·핑크 `#f43f5e`) | 가사, 스토리보드, 비디오 클립 렌더링이 결합된 고난도 MV 제작 공정을 앰프 데크 콘솔처럼 통제하기 위해 사이버 네온 콘솔 채택. |
| **18** | **Suno 음악기획 자동화** | `suno-music-studio` | `v1.09` | [https://suno-music-studio.buylife.xyz](https://suno-music-studio.buylife.xyz) | **사이버 수노 다크 스튜디오 스타일** | 다크(옵시디언 블랙) | Suno AI 프롬프트 및 가사 작사를 Suno Create 오리지널 분위기와 완벽히 동기화된 환경에서 기획하기 위해 사이버 수노 다크 스튜디오 채택. |
| **54** | **음악(SUNO)자동화** | `music-automation` | `v1.16` | [https://music-automation.buylife.xyz](https://music-automation.buylife.xyz) | **사이버 수노 다크 스튜디오 스타일** | 다크(딥블랙 `#09090b` + 오렌지 `#f97316`) | 곡 테마 기획부터 Suno AI 실제 보컬/연주곡 생성 및 음원 파일 보관을 위해 사이버 수노 다크 스튜디오 채택. |
| **77** | **AI 마스터링 스튜디오** | `ai-mastering-studio` | `v1.04` | [https://ai-mastering-studio.buylife.xyz](https://ai-mastering-studio.buylife.xyz) | **사이버 네온 다크 콘솔 스타일 — 오디오 마스터링 콘솔 에디션** | 다크(딥블랙 `#060911` + 네온 시안 `#00f0ff`·퍼플 `#7000ff`) | WAV 음원 파형 시각화, LUFS 음압 측정, EQ/컴프레서 조절을 전문 마스터링 엔지니어링 데크에서 수행하기 위해 사이버 네온 다크 콘솔 채택. |
| **78** | **AI Audio분석 자동화** | `ai-audio-analyzer` | `v1.04` | [https://audio.buylife.xyz](https://audio.buylife.xyz) | **사이버 네온 다크 콘솔 스타일 — 오디오 인텔리전스 랩 에디션** | 다크(딥블랙 `#060911` + 네온 시안 `#00f0ff`·바이올렛 `#8b5cf6`) | 오디오 음성 파일의 화자 분리, 텍스트 전사, 음향 주파수 진단 결과를 랩 콘솔에서 분석하기 위해 오디오 인텔리전스 랩 사이버 네온 콘솔 채택. |

### 6. [이커머스] 카테고리 (5개 프로그램)

| No | 프로그램명 | slug | 버전 | 서비스 링크 | 적용 디자인 템플릿 | 배경 테마 | 템플릿 선정 이유 및 UX/기능적 근거 (Why?) |
|:---:|---|---|:---:|---|---|---|---|
| **8** | **AI 12단 상세페이지 자동화** | `detail-page-12p` | `v1.09` | [https://detail-12p.buylife.xyz](https://detail-12p.buylife.xyz) | **포커스 스튜디오 스타일 (이커머스 상세페이지)** | 라이트(클린 슬레이트 `#f8fafc`) | 이커머스 12단 상세페이지 카피라이팅과 레이아웃 구조 설계를 서류 기획서처럼 정갈하게 작성할 수 있도록 포커스 스튜디오 채택. |
| **36** | **상세페이지 GIF 자동화** | `video-to-gif` | `v1.05` | [https://video-to-gif.buylife.xyz](https://video-to-gif.buylife.xyz) | **크리에이티브 아틀리에 스타일 — 이커머스 GIF 랩 에디션** | 다크(차콜 `#0d1117` + 앰버 골드 `#f59e0b`) | 상세페이지용 비디오를 브라우저 내 WASM으로 8MB 규격 GIF로 고속 변환하고 화질 사다리를 시각화하기 위해 이커머스 GIF 랩 아틀리에 채택. |
| **43** | **상품소싱 자동화** | `trending-product-finder` | `v1.14` | [https://trending-product-finder.buylife.xyz](https://trending-product-finder.buylife.xyz) | **스마트 매트릭스 스타일 (다크 슬레이트, Tailwind v3)** | 다크(차콜 `#0f1115` + 블루 `#2563eb`·앰버 `#f59e0b`) | 쇼핑 트렌드, 키워드 경쟁강도, 마진율 계산 등 이커머스 소싱 지표를 다각도로 비교 분석하기 위해 스마트 매트릭스 다크 슬레이트 채택. |
| **55** | **상세페이지 자동화(15p)** | `shop-detail-page` | `v1.14` | [https://shop-detail-page.buylife.xyz](https://shop-detail-page.buylife.xyz) | **이커머스 셀러 스튜디오 스타일** | 퓨어 화이트 (`#ffffff` + 블루 `#2563eb`·오렌지 `#f97316`) | 15개 섹션 블록 맵과 스마트스토어/쿠팡 860px 규격 상세페이지 원클릭 병합을 전문적으로 다루기 위해 이커머스 셀러 스튜디오 채택. |
| **61** | **상세페이지 자동생성기 v1** | `auto-detail-page` | `v1.13` | [https://auto-detail-page.buylife.xyz](https://auto-detail-page.buylife.xyz) | **이커머스 셀러 스튜디오 스타일 — 상세페이지 기획 에디션** | 퓨어 화이트 (로열 블루 `#2563eb` / 셀러 오렌지 `#f97316`) | 상품 핵심 소구점 도출부터 HTML 상세페이지 코드 실시간 프리뷰 및 내보내기를 위해 상세페이지 기획 이커머스 셀러 스튜디오 채택. |

### 7. [인스타] 카테고리 (6개 프로그램)

| No | 프로그램명 | slug | 버전 | 서비스 링크 | 적용 디자인 템플릿 | 배경 테마 | 템플릿 선정 이유 및 UX/기능적 근거 (Why?) |
|:---:|---|---|:---:|---|---|---|---|
| **15** | **AI 인플루언서 자동화** | `ai-influencer-studio` | `v1.13` | [https://ai-influencer.buylife.xyz](https://ai-influencer.buylife.xyz) | **크리에이티브 아틀리에 스타일 (핑크 화보 스튜디오 변형)** | 다크(미드나잇 `#0d0b12` + 핑크 `#ec4899`→로즈 `#f43f5e`) | 동일 얼굴(Consistent Face)을 유지하는 가상 인플루언서 화보 갤러리와 패션 룩북 생성을 위해 핑크 화보 스튜디오 변형 크리에이티브 아틀리에 채택. |
| **24** | **INSTA Cardnews 자동화** | `cardnews-studio` | `v1.23` | [https://cardnews-studio.buylife.xyz](https://cardnews-studio.buylife.xyz) | **크리에이티브 아틀리에 스타일 (인스타 카드뉴스 변형)** | 다크(인스타 선셋 그라디언트 & 미드나잇 `#0d0f17`) | 인스타그램 1:1 및 4:5 규격 카드뉴스 슬라이드 순서 편집과 비주얼 배치를 최적화하기 위해 인스타 선셋 테마의 크리에이티브 아틀리에 채택. |
| **25** | **AI 웹툰 자동화** | `ai-webtoon-studio` | `v1.13` | [https://ai-webtoon-automation.buylife.xyz](https://ai-webtoon-automation.buylife.xyz) | **크리에이티브 아틀리에 스타일 (웹툰 스튜디오 다크 변형)** | 다크(딥블랙 나이트 `#0a0d14` + 인디고 `#6366f1`·바이올렛 `#8b5cf6`) | 세로 스크롤 컷 만화 콘티와 캐릭터 일관성 유지 프롬프트 생성을 어두운 작업실에서 조망할 수 있도록 웹툰 스튜디오 아틀리에 채택. |
| **45** | **INSTA DM답변 자동화** | `instagram-dm-reply` | `v1.13` | [https://instagram-dm-reply.buylife.xyz](https://instagram-dm-reply.buylife.xyz) | **스튜디오 댓글 콘솔 — 인스타 라이트 변형 (DM 대화 화면) (47번 이식, Tailwind v3)** | 라이트(`#fafafa` + 인스타 파랑 `#0095f6`·그라데이션 포인트) | 실시간 인스타그램 DM 문의 내역과 자동 응답 규칙을 모바일 채팅 화면과 유사하게 조작하기 위해 인스타 라이트 스튜디오 댓글 콘솔 채택. |
| **47** | **INSTA 댓글자동화** | `instagram-comment-reply` | `v1.14` | [https://instagram-comment-reply.buylife.xyz](https://instagram-comment-reply.buylife.xyz) | **스튜디오 댓글 콘솔 — 인스타 라이트 변형 (threads v1.10 구성 이식, Tailwind v3)** | 라이트(`#fafafa` + 인스타 파랑 `#0095f6`·그라데이션 포인트) | 인스타 피드 댓글 모니터링과 AI 자동 답글 처리를 인스타 고유의 밝은 피드 감성으로 제어하기 위해 인스타 라이트 스튜디오 댓글 콘솔 채택. |
| **56** | **INSTA 포스팅 자동화** | `auto-instagram-posting` | `v1.24` | [https://insta-auto-poster.buylife.xyz](https://insta-auto-poster.buylife.xyz) | **플로우 위저드 스타일 (인스타 바이럴 변형)** | 다크(인스타 딥나이트 `#0d0f17` + 로즈/핑크 그라디언트) | 인스타 피드 사진 기획부터 본문 캡션, 해시태그, 예약 포스팅까지의 프로세스를 바이럴 감성으로 완주하기 위해 인스타 바이럴 플로우 위저드 채택. |

### 8. [쓰레드] 카테고리 (5개 프로그램)

| No | 프로그램명 | slug | 버전 | 서비스 링크 | 적용 디자인 템플릿 | 배경 테마 | 템플릿 선정 이유 및 UX/기능적 근거 (Why?) |
|:---:|---|---|:---:|---|---|---|---|
| **30** | **Threads 콘텐츠 운영 자동화** | `threads-content-ops` | `v2.04` | [https://threads-content-ops.buylife.xyz](https://threads-content-ops.buylife.xyz) | **스레드 바이럴 스튜디오 스타일** | 라이트(화이트/앰버) | Meta Threads 500자 제약, 6종 페르소나 카드, 멀티 계정 스케줄링을 쓰레드 공식 톤으로 다루기 위해 스레드 바이럴 스튜디오 채택. |
| **32** | **Threads AI 기획 자동화** | `threads-easy-planner` | `v1.43` | [https://threads-easy-planner.buylife.xyz](https://threads-easy-planner.buylife.xyz) | **스레드 바이럴 스튜디오 스타일 — 기획기 변형** | 라이트(화이트/블랙/앰버) | 초보자도 원클릭으로 Threads 첫 문장 훅과 CTA를 기획할 수 있도록 미니멀하고 가독성 높은 스레드 바이럴 스튜디오 기획기 변형 채택. |
| **44** | **Threads 쇼핑제휴 자동화** | `threads-affiliate-poster` | `v1.62` | [https://threads-affiliate-poster.buylife.xyz](https://threads-affiliate-poster.buylife.xyz) | **스레드 바이럴 스튜디오 스타일 (쇼핑제휴 변형)** | 다크(모노블랙 `#171717` + 앰버 `#f59e0b`·블루 `#3b82f6`) | 수익형 제휴 링크(쿠팡/알리)가 포함된 쓰레드 글 작성을 모노블랙 환경에서 집중 작성하기 위해 쇼핑제휴 변형 스레드 바이럴 스튜디오 채택. |
| **46** | **Threads 댓글자동화** | `threads-comment-reply` | `v1.10` | [https://threads-comment-reply.buylife.xyz](https://threads-comment-reply.buylife.xyz) | **스튜디오 댓글 콘솔 — 쓰레드 모노 변형 (youtube-auto-reply 구성 이식, Tailwind v3)** | 다크(`#101010` 흑백 + 흰 알약 버튼) | Threads 게시물 댓글 목록과 AI 링크 추천 답글을 흑백 모노톤으로 직관적으로 검수하기 위해 쓰레드 모노 스튜디오 댓글 콘솔 채택. |
| **60** | **Threads 포스팅 자동화** | `auto-threads-posting` | `v1.18` | [https://threads-auto-poster.buylife.xyz](https://threads-auto-poster.buylife.xyz) | **스레드 바이럴 스튜디오 스타일** | 다크(모노블랙 `#171717` + 앰버 `#f59e0b`) | 스레드 글감 선택부터 AI 초안 작성, 1~3장 이미지 첨부, 즉시/예약 발행을 일관되게 진행하기 위해 스레드 바이럴 스튜디오 채택. |

### 9. [Tools] 카테고리 (9개 프로그램)

| No | 프로그램명 | slug | 버전 | 서비스 링크 | 적용 디자인 템플릿 | 배경 테마 | 템플릿 선정 이유 및 UX/기능적 근거 (Why?) |
|:---:|---|---|:---:|---|---|---|---|
| **20** | **eBook Studio** | `ebook-studio` | `v1.09` | [https://ebook-studio.buylife.xyz](https://ebook-studio.buylife.xyz) | **포커스 스튜디오 스타일 — 전자책 퍼블리싱 에디션** | 라이트(소프트 크림 `#fbfbf9` + 딥 인디고 `#4f46e5`) | 전자책 장(Chapter)별 구조화, 목차 편성, EPUB/PDF 출판 서식 검수를 전문 출판실처럼 집필하기 위해 전자책 퍼블리싱 포커스 스튜디오 채택. |
| **37** | **AIMaster 타로점** | `tarot-reading` | `v1.13` | [https://tarot-reading.buylife.xyz](https://tarot-reading.buylife.xyz) | **크리에이티브 아틀리에 스타일 — 신비로운 미드나잇 퍼플 랩 에디션** | 딥 미드나잇 퍼플 (`#090614` + 바이올렛 `#a855f7`) | 78장 타로 아르카나 3D 카드 셔플과 플립 애니메이션, 신비로운 해석 가이드북을 위해 미드나잇 퍼플 랩 아틀리에 채택. |
| **38** | **캐릭코드(MBTI) 측정기** | `mbti-character` | `v1.14` | [https://mbti-character.buylife.xyz](https://mbti-character.buylife.xyz) | **크리에이티브 아틀리에 스타일 — 파스텔 크림 에디션** | 파스텔 크림 (`#fefcf9`) & 코랄 로즈/라벤더 | 16대 오리지널 성격 캐릭터 도감과 20문항 빠른 검사의 감성적 접근을 위해 따뜻한 파스텔 크림 캐릭터 아틀리에 채택. |
| **39** | **성격코드(MBTI) 측정기** | `personality-code` | `v1.04` | [https://personality-code.buylife.xyz](https://personality-code.buylife.xyz) | **크리에이티브 아틀리에 스타일 — 파스텔 퍼스널리티 랩 에디션** | 파스텔 크림 (`#faf8f5`) & 4대 지표 컬러 | 4대 이분지표(E/I, S/N, T/F, J/P)의 4색 시그니처 컬러와 16가지 성격유형 정밀 분석을 위해 파스텔 퍼스널리티 랩 아틀리에 채택. |
| **62** | **AI 할 일·성과 관리** | `ai-task-planner` | `v1.08` | [https://ai-task-planner.buylife.xyz](https://ai-task-planner.buylife.xyz) | **스마트 매트릭스 다크 스타일** | 다크(딥 나이트 네이비 `#0b0f19`) | 할 일 목록, 당일 집중 시간 차트, AI 성과 피드백 리포트를 한 화면에 3열로 조망하기 위해 딥 나이트 네이비 생산성 스마트 매트릭스 채택. |
| **63** | **AI 종합 성격 진단 자동화** | `personality-suite` | `v1.06` | [https://personality-suite.buylife.xyz](https://personality-suite.buylife.xyz) | **크리에이티브 아틀리에 스타일 — 파스텔 퍼스널리티 스위트 에디션** | 파스텔 크림 (`#fefcf9`) & 코랄 로즈/라벤더 | Big 5, DISC, 에니어그램 등 7대 종합 심리 검사와 AI 다면 융합 프로필을 따뜻하고 편안하게 진단받을 수 있도록 파스텔 퍼스널리티 아틀리에 채택. |
| **64** | **AI 문서번역 자동화** | `document-translator` | `v1.04` | [https://document-translator.buylife.xyz](https://document-translator.buylife.xyz) | **포커스 스튜디오 스타일 — 소프트 크림 문서번역 에디션** | 라이트(소프트 크림 `#fdfbf7` + 딥 인디고 `#4f46e5`) | 원문과 10개 언어 번역 결과를 좌우로 대조하며 전문 용어집 매칭과 역번역 검수를 편안하게 진행하기 위해 소프트 크림 포커스 스튜디오 채택. |
| **65** | **AI 엑셀·텍스트 합치기 자동화** | `file-merge` | `v1.07` | [https://file-merge.buylife.xyz](https://file-merge.buylife.xyz) | **스마트 매트릭스 스타일 — 라이트 변형 (라이트 토큰 기준값)** | 라이트(`#f6f7f9`/`#ffffff` + 블루 `#2563eb`·앰버 `#b45309`) | 엑셀, CSV, TXT 파일을 브라우저에서 안전하게 머리글 기준으로 병합하고 데이터 미리보기를 제공하기 위해 스마트 매트릭스 라이트 변형 채택. |
| **84** | **AI 문서 챗봇 자동화** | `ai-doc-chatbot` | `v1.05` | [https://ai-doc-chatbot.buylife.xyz](https://ai-doc-chatbot.buylife.xyz) | **포커스 스튜디오 스타일 — 미드나잇 챗 콘솔 변형** | 다크(미드나잇 `#0d0f17` + 인디고→스카이 포인트) | 내 사내 문서/PDF 기반 RAG 검색 및 최신 Tavily 웹 검색 결과를 출처 링크와 함께 1:1 대화로 확인하기 위해 미드나잇 챗 콘솔 포커스 스튜디오 채택. |

### 10. [네이버] 카테고리 (4개 프로그램)

| No | 프로그램명 | slug | 버전 | 서비스 링크 | 적용 디자인 템플릿 | 배경 테마 | 템플릿 선정 이유 및 UX/기능적 근거 (Why?) |
|:---:|---|---|:---:|---|---|---|---|
| **35** | **네이버 블로그 SEO 스튜디오** | `naver-blog-seo-studio` | `v1.73` | [https://naver-blog-seo-studio.buylife.xyz](https://naver-blog-seo-studio.buylife.xyz) | **스마트 매트릭스 스타일 — 라이트 변형 · 네이버 그린 포인트 (일반 CSS 변수)** | 라이트(`#f6f7f9` + 네이버 그린 `#009b4d`/`#03c75a`) | 블로그 형태소 분석, 형태소 빈도 차트, 네이버 상위 노출 SEO 알고리즘 지표를 정밀 진단하기 위해 네이버 그린 스마트 매트릭스 채택. |
| **40** | **네이버 카페 포스팅 자동화** | `naver-cafe-poster` | `v1.15` | [https://naver-cafe-poster.buylife.xyz](https://naver-cafe-poster.buylife.xyz) | **플로우 위저드 스타일 — 네이버 카페 그린 에디션** | 라이트(클린 슬레이트 `#f8fafc` + 네이버 그린 `#03c75a`) | 가입 카페 목록 조회부터 AI 카페 본문 생성, 예약 등록까지의 포스팅 여정을 네이버 감성으로 안내하기 위해 네이버 카페 그린 플로우 위저드 채택. |
| **66** | **네이버 블로그 자동화(App)** | `naver-blog-auto-poster` | `v1.12` | [https://naver-blog-auto-poster.buylife.xyz](https://naver-blog-auto-poster.buylife.xyz) | **플로우 위저드 스타일 (권장)** | 라이트(화이트) | 데스크톱 앱 환경에서 네이버 블로그 글쓰기 자동 입력을 단계별로 보조하기 위해 플로우 위저드 스타일 권장(현재 정책상 보류). |
| **67** | **네이버 블로그 자동화(Web)** | `naver-blog-auto-poster-web` | `v1.13` | [https://naver-blog-auto-poster-web.buylife.xyz](https://naver-blog-auto-poster-web.buylife.xyz) | **플로우 위저드 스타일 (권장)** | 라이트(화이트) | 크롬 웹 확장 환경에서 네이버 블로그 스마트에디터 입력을 보조하기 위해 플로우 위저드 스타일 권장(현재 정책상 보류). |

### 11. [CRM] 카테고리 (2개 프로그램)

| No | 프로그램명 | slug | 버전 | 서비스 링크 | 적용 디자인 템플릿 | 배경 테마 | 템플릿 선정 이유 및 UX/기능적 근거 (Why?) |
|:---:|---|---|:---:|---|---|---|---|
| **41** | **카카오톡 뉴스레터 자동화** | `kakao-auto-posting` | `v1.16` | [https://kakao-auto-posting.buylife.xyz](https://kakao-auto-posting.buylife.xyz) | **플로우 위저드 스타일 — 카카오 옐로우 뉴스레터 에디션** | 클린 화이트 (카카오 옐로우 `#fee500` / 다크 차콜 `#191919`) | 카카오톡 공식 옐로우 브랜드 감성과 뉴스레터 구독자 관리부터 발송 성과 분석까지 4단계 스텝퍼 완주를 위해 카카오 옐로우 플로우 위저드 채택. |
| **52** | **구글폼 CRM 자동화** | `crm-google-form` | `v1.09` | [https://crm-google-form.buylife.xyz](https://crm-google-form.buylife.xyz) | **스마트 매트릭스 스타일 — 라이트 변형 (Tailwind v3 첫 적용)** | 라이트(`#f6f7f9`/`#ffffff` + 블루 `#2563eb`·앰버 `#b45309`) | 구글폼 설문 접수자 명단, 접수 확인 알림 상태, 고객 CRM 데이터를 밝고 깔끔한 표로 조망하기 위해 라이트 변형 스마트 매트릭스 채택. |

### 12. [마케팅(홍보)] 카테고리 (4개 프로그램)

| No | 프로그램명 | slug | 버전 | 서비스 링크 | 적용 디자인 템플릿 | 배경 테마 | 템플릿 선정 이유 및 UX/기능적 근거 (Why?) |
|:---:|---|---|:---:|---|---|---|---|
| **49** | **롱테일 키워드분석 자동화** | `longtail-keyword-expander` | `v1.07` | [https://longtail-keyword-expander.buylife.xyz](https://longtail-keyword-expander.buylife.xyz) | **스마트 매트릭스 스타일 (기준 구현)** | 다크(차콜 `#0f1115` + 블루 `#2563eb`·앰버 `#f59e0b`) | 키워드 확장 결과 수백 개와 검색량, 난이도 지표를 빠르게 정렬·필터링하기 위해 스마트 매트릭스 기준 구현 스타일 채택. |
| **50** | **경쟁사 키워드분석 자동화** | `competitor-analysis` | `v1.07` | [https://competitor-analysis.buylife.xyz](https://competitor-analysis.buylife.xyz) | **스마트 매트릭스 스타일 (기준 구현과 같은 뼈대)** | 다크(차콜 `#0f1115` + 블루 `#2563eb`·앰버 `#f59e0b`) | 경쟁사 콘텐츠 구조 분석 및 구글 SERP 순위 매트릭스를 비교 조망하기 위해 스마트 매트릭스 다크 스타일 채택. |
| **51** | **예약(취소)방지 리마인드** | `booking-reminder` | `v1.06` | [https://booking-reminder.buylife.xyz](https://booking-reminder.buylife.xyz) | **플로우 위저드 스타일 — 캘린더 리마인드 에디션** | 라이트/화이트 (에메랄드/인디고 액센트) | 예약 시간 기준 D-Day별(D-3, D-1, 당일) 알림톡/문자 발송 시퀀스를 타임라인 파이프라인으로 시각화하기 위해 캘린더 리마인드 플로우 위저드 채택. |
| **53** | **대량 메일발송 자동화** | `stepmail` | `v1.16` | [https://stepmail.buylife.xyz](https://stepmail.buylife.xyz) | **플로우 위저드 스타일 — 스텝메일 마케팅 에디션** | 라이트/화이트 (스카이블루 `#0284c7` / 인디고 `#4f46e5`) | 1~5차 스텝메일 시퀀스 기획, 발송 일정 스케줄링, 수신자 오픈율 추적을 단계별로 관리하기 위해 스텝메일 마케팅 플로우 위저드 채택. |

### 13. [멀티미디어] 카테고리 (3개 프로그램)

| No | 프로그램명 | slug | 버전 | 서비스 링크 | 적용 디자인 템플릿 | 배경 테마 | 템플릿 선정 이유 및 UX/기능적 근거 (Why?) |
|:---:|---|---|:---:|---|---|---|---|
| **2** | **뮤직 플레이어 자동화** | `music-player` | `v1.03` | [https://music-player.buylife.xyz](https://music-player.buylife.xyz) | **사이버 네온 다크 콘솔 스타일** | 다크(딥블랙) | 음악 재생, 8밴드 EQ 조절, 오디오 비주얼라이저의 직관적 조작을 위해 하이테크 앰프 랙마운트 콘솔 인터페이스 채택. |
| **14** | **무한루프 영상자동화** | `infinite-loop-video` | `v1.05` | [https://infinite-loop-video.buylife.xyz](https://infinite-loop-video.buylife.xyz) | **크리에이티브 아틀리에 스타일 (네온 루프 시네마 변형)** | 다크(차콜 `#0b0d12` + 네온 핑크 `#ec4899`→시안 `#22d3ee`) | 자연스러운 영상 루프 이음새 탐색과 비디오 플레이어 캔버스 미리보기를 돋보이게 하기 위해 네온 루프 시네마 변형 크리에이티브 아틀리에 채택. |
| **73** | **AI 리버스 프롬프트 자동화** | `reverse-prompt` | `v1.05` | [https://reverse-prompt.buylife.xyz](https://reverse-prompt.buylife.xyz) | **크리에이티브 아틀리에 스타일 — 리버스 프롬프트 아키텍트 에디션** | 다크(미드나잇 `#0b0e14` + 앰버 `#f59e0b`·바이올렛 `#8b5cf6`) | 업로드한 이미지, 음악, 영상 미디어에서 역생성된 프롬프트 파라미터 구조를 캔버스와 함께 분석하기 위해 크리에이티브 아틀리에 채택. |

### 14. [부동산] 카테고리 (1개 프로그램)

| No | 프로그램명 | slug | 버전 | 서비스 링크 | 적용 디자인 템플릿 | 배경 테마 | 템플릿 선정 이유 및 UX/기능적 근거 (Why?) |
|:---:|---|---|:---:|---|---|---|---|
| **57** | **부동산 실거래 투자분석** | `real-estate-sales` | `v1.11` | [https://real-estate-sales.buylife.xyz](https://real-estate-sales.buylife.xyz) | **스마트 매트릭스 스타일 (다크 슬레이트, Tailwind v4)** | 다크(차콜 `#0f1115` + 블루 `#2563eb`·앰버 `#f59e0b`) | 서울 자치구별 실거래가 추이, 평당가 히트맵, AI 투자 매력도 스코어를 고밀도 표로 분석하기 위해 다크 슬레이트 스마트 매트릭스 채택. |

---

## 🤝 타 CLI를 위한 실전 협업 및 개발 가이드

1. **새로운 기능 추가 또는 리뉴얼 시 템플릿 준수**:
   - 다른 CLI(Claude Code, Codex 등)는 본 문서의 카테고리별 표를 먼저 확인하고, 해당 프로그램에 이미 확정된 템플릿 톤앤매너와 컬러 토큰을 일관되게 유지해야 합니다.
   - 만약 새로운 화면을 추가하더라도 동일 카테고리 내 타 프로그램의 검증된 레이아웃(예: 블로그군 ➔ 플로우 위저드, 텍스트군 ➔ 포커스 스튜디오)을 준용합니다.
2. **템플릿 변경이 필요한 경우**:
   - 임의로 템플릿이나 배경 테마를 변경하지 않고, 본 문서에 기록된 기존 선정 이유를 검토한 뒤 더 나은 방향이 있을 때만 사전 플랜(`docs/PLAN_*.md`)을 수립하여 주인님의 승인을 거친 후 진행합니다.
3. **문서 동기화 의무**:
   - 신규 프로그램이 추가되거나 버전이 변경될 경우, 본 문서(`docs/PROGRAM_CATEGORY_TEMPLATE_MAP.md`), `DESIGN.md`, `docs/DESIGN_TEMPLATE_CATALOG.md`, `docs/PROGRAM_CAPABILITY_MAP.md`를 함께 갱신합니다.
