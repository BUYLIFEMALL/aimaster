# 이미지 자동화 (AI Image Studio / ai-image-studio)

> **공식 서비스 URL**: [https://ai-image-studio.buylife.xyz](https://ai-image-studio.buylife.xyz)  
> **현재 버전**: `v1.22` (크리에이티브 아틀리에 럭셔리 다크 스타일 템플릿)
> **담당 CLI**: Antigravity CLI (agy) / Claude Code / Codex 공통

AIMaster 플랫폼의 **AI 이미지 자동화 레퍼런스(기준) 프로그램**인 **AI Image Studio**입니다.  
타 서브프로그램의 이미지 생성 모델 연동(`lib/providers/adapters/`)의 기준점이 되며, 33종 플래그십 AI 모델과 프롬프트 엔지니어링 표준을 지원합니다.

---

## 1. 프로그램 사용목적 및 대상 (Target & Purpose)
- **사용 목적**: 
  - 다양한 최신 AI 이미지 생성 엔진(Google Gemini, OpenAI GPT Image, Replicate FLUX 2.0/Seedream/Recraft/Ideogram/Z-Image)을 한곳에서 손쉽게 비교·생성·관리.
  - 비전문가도 클릭 몇 번으로 카메라 광학 메타데이터, 45도 자연광, 3단 심도, 사실적 한국인 인물 묘사가 포함된 영문 마스터 프롬프트를 만들고 즉시 고화질 이미지를 생성.
- **대상 사용자**: 
  - 상세페이지 기획자, 바이럴 마케터, 유튜브 크리에이터, 브랜딩 디자이너, 쇼핑몰 운영자 및 고품질 비주얼 콘텐츠가 필요한 일반 회원.

---

## 2. 개발 구현 도구 / 개발기법 / 플러그인 / 스킬
- **프레임워크**: Next.js 15 (App Router), TypeScript, React 19.
- **UI/UX 디자인**: Tailwind CSS, `globals.css` 크리에이티브 아틀리에 앰버 글로우 테마, 24px 모눈 격자 배경, Lucide React 아이콘.
- **아키텍처**:
  - **Multi-Provider Adapter Pattern**: `lib/providers/registry.ts` 및 `lib/providers/adapters/*.ts` (Gemini, OpenAI, Replicate).
  - **Dynamic OpenAPI Schema Form Renderer**: `components/OptionFormRenderer.tsx` 기반 슬라이더, 셀렉트, 텍스트박스 동적 렌더링.
  - **최상위 회원 키 원칙**: 타인 키 폴백 없이 로그인 회원 본인의 API 키(`user_api_keys`)만 격리 조회.
- **데이터베이스/인증**: Supabase Auth (SSO `.buylife.xyz` 세션 쿠키), PostgreSQL DB, Supabase Storage (`generated-images` 버킷).
- **공식 표준 로그인 규격**: 루트 `threads-comment-reply/app/(auth)` 기준 상단 타이틀/로고 + 알약형 `[로그인] / [회원가입]` 2버튼 탭 토글 바 적용.

---

## 3. 핵심 기능 및 아키텍처 (장단점 분석)
### 1) 주요 기능
1. **비주얼 사용 매뉴얼 (`/guide`)**: 5단계 파이프라인(키 연동 -> 스타일 선택 -> 마스터 프롬프트 생성 -> 모델 선택 -> 갤러리 보관), 4대 골든 팁, 4대 FAQ 제공.
2. **Step 1: 마스터 프롬프트 생성기**: 16종 화풍 프리셋(실사 포토리얼리즘, 픽사 3D, 지브리 애니 등) 및 각 10종 총 160개 추천 태그, `IMAGE_PROMPT_RULES` 공식 표준 실시간 주입.
3. **Step 2: 다중 플랫폼 & 모델 옵션 생성기**: 33종 최신 모델, $0.0336 최저가 테스트 모델 뱃지 및 4K 하이엔드 뱃지 제공.
4. **갤러리 및 보관함 (`/projects`)**: 생성 이미지 다운로드 및 메타데이터 보관.

### 2) 시스템 장단점
- **장점**: 모든 서브프로그램의 이미지 연동 기준점(Reference) 역할, OpenAPI 스키마 기반의 뛰어난 확장성, 본인 키 기반 격리 보안.
- **단점/한계**: Replicate 비활성 모델의 콜드스타트 대기시간 존재, 외부 API 키 미등록 시 생성 불가.

---

## 4. 현재 버전 및 버전별 히스토리
- **`v1.12` (2026-10-17)**: 
  - 루트 공식 표준 로그인 레이아웃 준수 (`app/login/layout.tsx`, `page.tsx`).
  - 비주얼 사용 매뉴얼 (`/guide`) 신설 및 사이드바 배너 연동.
  - 크리에이티브 아틀리에 럭셔리 다크 템플릿 적용 (`#09090b` 일체화, 골드 네온 글로우, 5대 프롬프트 원칙 배너, 최저가 권장 뱃지).
  - 7대 핵심 규격화 문서 완비 (`AGENTS.md`, `README.md`, `docs/IMPROVEMENT_BACKLOG.md`).
- **`v1.11` (2026-10-17)**: 구글 Gemini 최신 정식 모델(`gemini-nano-banana-2.1` 2K/4K, `gemini-3-pro-image`, `gemini-3.1-flash-lite-image`) 교체.
- **`v1.10` (2026-10-16)**: 도메인 통일(SSO) 적용 (`ai-image-studio.buylife.xyz`).
- **`v1.09` (2026-10-16)**: 공용 Supabase DB 연동 환경변수 호환.
- **`v1.08` (2026-10-12)**: 핸드폰 번호 필수 정책 연동.
- **`v1.07` (2026-10-09)**: 하드코딩된 서비스 키 완전 제거.
- **`v1.06` (2026-10-09)**: 본인 API 키 격리(TOP_RULE) 및 게스트 우회 전면 제거.

---

## 5. 남아 있는 추가 작업 대기 내용
상세 내용은 [`docs/IMPROVEMENT_BACKLOG.md`](docs/IMPROVEMENT_BACKLOG.md)를 참조하십시오.
- 인터랙티브 이미지 인페인팅/아웃페인팅 캔버스 도입.
- Image-to-Image / Style Transfer 워크플로우 탭 신설.
- 생성 이미지 일괄 다운로드(ZIP) 및 30일 격리 파기 Cron 연동.

---

## 6. 타 프로그램 연계 및 확장 아이디어
- `detail-page-maker-12p` (상세페이지 12P) 연출컷 자동 생성 모듈 연동.
- `music-album-cover` (바이닐 앨범 커버) 35mm 필름 / 수묵화 어댑터 SDK 공급.
- `youtube-playlist-maker` (유튜브 플레이리스트) 16:9 썸네일 타이포그래피 특화 모델 연동.

---

## 7. 사용자 편의성 증대 디자인 UI 개선안
- 화면비(Aspect Ratio) 비주얼 사각형 그리드 셀렉터 도입.
- 생성 전 실시간 토큰 비용 및 예상 소요시간 계산기 위젯 탑재.

## 2026-10-20 v1.19
사용 매뉴얼 배너 위치를 API키등록 메뉴 바로 위로 변경했습니다. [작업 결과·검수·남은 일](docs/IMPROVEMENT_HANDOFF_20261020_MANUAL_MENU.md).

## 2026-10-20 v1.20 — 상황별 영문 프롬프트 160개 상세 보강 (Codex)
- 16개 화풍별 10개 본문을 직접 다시 작성. 제목·분류·순서 보존, 기본 예시 JSON을 초기 등록/작업실에서 함께 사용.
- 원문 백업·원문 일치 조건이 있는 일괄 DB 교체/복구 자료·문구 검사 4개·권한 검사·빌드. 유료 이미지 생성 미실시.
- [계획](docs/PLAN_20261020_ENGLISH_PROMPTS.md) · [작업 결과/운영 증거/남은 일](docs/IMPROVEMENT_HANDOFF_20261020_ENGLISH_PROMPTS.md).

## 2026-10-20 v1.21 — 회원별 커스텀 화풍 프롬프트 (Codex 윈도우)
- 기본 예시를 개인 사본으로 만들어 저장·수정·삭제·복사·작업실에서 그대로 사용. 공통 원본은 관리자만 관리합니다. 개인 전용 DB/RLS·30일 만료·자동 정리, 원본 삭제 시 사본 보존.
- 로컬 API/DB 검사 18개·기존 검사 16개·권한 검사·빌드·보이는 Edge 가상 회원 2명(1440/375) 통과. 실제 SSO/운영 검수와 구분합니다.
- [개발 계획](docs/PLAN_20261020_CUSTOM_STYLE_PROMPTS.md) · [상세 인수인계/운영 증거/남은 일](docs/IMPROVEMENT_HANDOFF_20261020_CUSTOM_STYLE_PROMPTS.md).


## 2026-10-20 v1.22 — 문서 챗봇 기준 메뉴 레이아웃 (Codex)
- 제목/버전·카탈로그 링크·아이콘 작업 메뉴·도움말 및 설정·계정 밀착으로 정렬. 주인님 제시 화면에 따라 번호형 메뉴의 해당 앱 예외로 적용. 모바일 접는 메뉴/Escape/활성 표시를 함께 반영.
- 빌드·보이는 Edge 1440/375·낮은 높이·767/768 전환 검사 통과. [계획](docs/PLAN_20261020_SIDEBAR_ALIGNMENT.md) · [운영 결과/인수인계](docs/IMPROVEMENT_HANDOFF_20261020_SIDEBAR_ALIGNMENT.md).
