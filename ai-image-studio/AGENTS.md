# AI 이미지 스튜디오 (ai-image-studio) — AI 에이전트 인수인계 문서 (AGENTS.md)

> **공식 서비스 URL**: [https://ai-image-studio.buylife.xyz](https://ai-image-studio.buylife.xyz)  
> **현재 버전**: `v1.22` (크리에이티브 아틀리에 럭셔리 다크 스타일 템플릿)
> **상위 지침**: 루트 [`../AGENTS.md`](../AGENTS.md) 및 [`../DESIGN.md`](../DESIGN.md), [`../docs/IMAGE_PROMPT_RULES.md`](../docs/IMAGE_PROMPT_RULES.md)

---

## 1. 프로그램 사용목적 및 대상 (Target & Purpose)
- **사용 목적**: 
  - 다양한 최신 AI 이미지 생성 엔진(Google Gemini, OpenAI GPT Image, Replicate FLUX 2.0/Seedream/Recraft/Ideogram/Z-Image)을 단일 워크스페이스에서 손쉽게 비교·생성·관리하는 **플랫폼 전체의 이미지 레퍼런스 기준 프로그램**.
  - 비전문가도 클릭 몇 번으로 전문가 수준의 마스터 프롬프트(카메라 광학 메타데이터, 45도 자연광, 사실적 한국인 인물 묘사, 3단 심도, 네거티브 프롬프트 배제)를 생성하고 33종의 플래그십 모델로 즉시 고화질 이미지를 제작하도록 지원.
- **대상 사용자**: 
  - 상세페이지 기획자, 바이럴 마케터, 유튜브 크리에이터, 브랜딩 디자이너, 쇼핑몰 운영자 및 고품질 비주얼 콘텐츠가 필요한 일반 회원.

---

## 2. 개발 구현 도구 / 개발기법 / 플러그인 / 스킬
- **프레임워크 및 런타임**: Next.js 15 (App Router), TypeScript, React 19.
- **스타일링 & 비주얼**: Tailwind CSS, `app/globals.css` 크리에이티브 아틀리에 럭셔리 다크 테마 토큰, 24px 모눈 격자 배경, Lucide React 아이콘.
- **아키텍처 패턴**:
  - **Multi-Provider Adapter Pattern**: `lib/providers/registry.ts` 기반 스키마 선언 및 `lib/providers/adapters/*.ts` (Gemini, OpenAI, Replicate) 격리 구현.
  - **Dynamic OpenAPI Schema Form Renderer**: `components/OptionFormRenderer.tsx`를 통해 Replicate 모델의 슬라이더, 셀렉트, 텍스트박스 동적 UI 렌더링.
  - **최상위 회원 키 원칙**: `lib/access.ts` 및 `lib/userKeys.ts`를 통해 타인 키 폴백 없이 로그인 회원 본인이 등록한 API 키(`user_api_keys`)만 격리 조회 및 사용.
- **데이터베이스 & 스토리지**: Supabase Auth (SSO `.buylife.xyz` 세션 쿠키), PostgreSQL DB, Supabase Storage (`ai-image-generations` 버킷 — v1.23부터 비공개·서명 주소).
- **인증 화면 규격**: 루트 공식 표준(`threads-comment-reply/app/(auth)` 기준) 로그인/회원가입 2버튼 알약 탭 토글 바 및 24px 격자 모눈 배경 적용.

---

## 3. 핵심 기능 및 시스템 로직 / 아키텍처 (장단점 분석)
### 1) 핵심 기능 및 파이프라인
1. **비주얼 사용 매뉴얼 (`/guide`)**: 
   - 5단계 파이프라인(키 연동 -> 스타일 선택 -> 마스터 프롬프트 생성 -> 모델 선택 -> 갤러리 보관), 4대 골든 팁, 4대 FAQ 제공 (비로그인 공개 열람 지원).
2. **Step 1: 마스터 프롬프트 생성기 (`Step1PromptEnhancer.tsx`)**:
   - 16종 화풍/화법 프리셋(실사 포토리얼리즘, 픽사 3D, 지브리 애니, 일본 2D 극장판, 사이버펑크, 35mm 필름 등) 및 각 10종 총 160개 추천 아이디어 퀵 칩.
   - `IMAGE_PROMPT_RULES` 공식 표준 실시간 주입 (카메라 렌즈 메타데이터, 광원 각도, 한국인 인물 자연스러운 묘사, 3단 심도, 필수 네거티브).
   - 1-Click Step 2 자동 전송 및 즉시 하이라이트 포커스.
3. **Step 2: 다중 플랫폼 & 모델 옵션 생성기 (`Step2PlatformGenerator.tsx`)**:
   - 3대 플랫폼(OpenAI, Google Gemini, Replicate) 및 33종 최신 모델 지원.
   - 최저가 테스트 모델 뱃지(`gemini-3.1-flash-lite-image`, $0.0336) 및 4K 하이엔드 뱃지 제공.
   - 비율, 해상도, 시드, 레이어 분해, 연작 시퀀스 등 세부 옵션 동적 폼.
4. **갤러리 및 보관함 (`/projects`)**:
   - 생성된 이미지는 회원별 격리 저장되며 프롬프트, 모델 메타데이터, 다운로드 기능 지원.

### 2) 시스템 장점
- **레퍼런스 프로그램 위상**: 타 서브프로그램(상세페이지, 바이닐 커버, 유튜브 썸네일 등) 개발 시 이미지 생성 API 어댑터(`lib/providers/adapters/`)를 즉시 그대로 복사·활용 가능.
- **비용 최적화 가이드**: $0.0336 최저가 모델부터 4K 초고화질 모델까지 단계별 선택 가이드 제공.
- **스키마 확장성**: 모델 추가 시 UI 코드 수정 없이 `registry.ts` 스키마 등록만으로 자동 지원.

### 3) 단점 및 한계
- Replicate API의 경우 비활성 모델 최초 호출 시 콜드스타트(약 20~40초) 대기시간 발생 가능.
- 외부 API 키가 미등록된 회원은 생성 불가능(사전 설정 페이지 유도 필요).

---

## 4. 현재 버전 및 버전별 변경 히스토리 (Changelog)

### `v1.12` (2026-10-17) — Antigravity CLI (agy)
- **공식 표준 로그인 레이아웃 준수**: `threads-comment-reply/app/(auth)` 기준 `app/login/layout.tsx` (24px 앰버 격자 모눈 배경, 44px 🎨 로고, 프로그램 타이틀) 및 `app/login/page.tsx` (알약형 `[로그인] / [회원가입]` 2버튼 탭 토글 바, 아이콘 필드, 비번찾기, 법적 고지 푸터) 신설.
- **비주얼 사용 매뉴얼 (`/guide`) 전면 구축**: `ImageGuideView.tsx` 및 `app/guide/page.tsx` 신설, 5단계 파이프라인, 4대 골든 팁, 4대 FAQ, 사이드바 `📖 연동 & 사용 매뉴얼` 배너 연동.
- **크리에이티브 아틀리에 럭셔리 다크 템플릿 적용**: `globals.css` 및 전 화면 배경 `bg-[#09090b]` 통일, 골드/앰버 네온 글로우, 5대 마스터 프롬프트 생성 원칙 배너, 최저가 테스트 모델 뱃지 탑재.
- **문서 규격화 및 백로그 신설**: `AGENTS.md`, `README.md` 7대 규격 완비, `docs/IMPROVEMENT_BACKLOG.md`, `docs/IMPROVEMENTS.md`, `docs/PLAN_20261017_DESIGN_RENEWAL.md` 작성.

### `v1.11` (2026-10-17) — Claude Code
- 구글 Gemini 이미지 모델 정식 교체: `gemini-nano-banana-2.1` (2K/4K), `gemini-3-pro-image`, `gemini-3.1-flash-lite-image` (1K 최저가).
- 플랫폼 이미지 자동화 레퍼런스(기준) 프로그램 공식 지정.

### `v1.10` (2026-10-16)
- 도메인 통일(SSO) 적용: `https://ai-image-studio.buylife.xyz`, `.buylife.xyz` 쿠키 세션 공유.

### `v1.09` (2026-10-16)
- 공용 Supabase DB 연동 환경변수 호환 (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` 등).

### `v1.08` (2026-10-12)
- 핸드폰 번호 필수 정책 연동.

### `v1.07` (2026-10-09)
- 하드코딩된 서비스 키 완전 제거 및 환경변수 격리화.

### `v1.06` (2026-10-09)
- 최상위 규칙(TOP_RULE)에 맞춘 본인 API 키 격리 및 게스트 우회 전면 제거.

---

## 5. 남아 있는 추가 프로그램 및 디자인 작업 대기 내용
상세 내용은 [`docs/IMPROVEMENT_BACKLOG.md`](docs/IMPROVEMENT_BACKLOG.md) 및 [`docs/IMPROVEMENTS.md`](docs/IMPROVEMENTS.md)를 참조한다.
1. **인터랙티브 이미지 인페인팅/아웃페인팅 캔버스 도입** (브러시로 영역을 지정해 특정 부분만 AI 재성형).
2. **이미지 대 이미지 (Image-to-Image / Style Transfer) 워크플로우 탭 신설**.
3. **생성 히스토리 다중 선택 일괄 다운로드 (ZIP) 및 Supabase 스토리지 30일 자동 파기 Cron 연동**.

---

## 6. 타 프로그램 연계 및 기능 병합/확장 아이디어 제안
1. **상세페이지 제작 자동화 (`detail-page-maker-12p`) 연계**:
   - 상세페이지 각 섹션(소구점, 비포애프터, 원료 컷)에 필요한 고해상도 제품 연출컷을 `ai-image-studio`의 `recraft-v4.1` 및 `gemini-nano-banana-2.1` 어댑터로 직접 생성 연계.
2. **바이닐 앨범 커버 제작기 (`music-album-cover`) 연계**:
   - `ai-image-studio`의 35mm 필름 및 수묵화/애니메이션 프리셋 어댑터를 바이닐 커버 생성 모듈에 공통 SDK 형태로 공급.
3. **유튜브 플레이리스트/썸네일 자동화 (`youtube-playlist-maker`) 연계**:
   - 16:9 규격 썸네일 생성 시 `ideogram-v4-quality`(타이포그래피 및 글자 렌더링 특화)를 호출하여 텍스트 깨짐 없는 썸네일 자동 합성.

---

## 7. 사용자 편의성 증대를 위한 디자인 UI 개선안 & 레이아웃 변경 제안
1. **화면비(Aspect Ratio) 비주얼 썸네일 그리드 셀렉터**:
   - 텍스트 드롭다운 형태의 비율 선택 대신 `[ 1:1 정방형 ]`, `[ 16:9 와이드 ]`, `[ 9:16 쇼츠 ]` 형태의 직관적인 미니 사각형 그래픽 카드 셀렉터 도입.
2. **실시간 토큰 비용 및 예상 소요시간 계산기 위젯**:
   - 모델 및 화질(1K/2K/4K), 매수 선택에 따른 실시간 소요 예상 비용(예: `$0.034`)을 생성 버튼 옆에 툴팁 형태로 안내하여 사용자 편의성 극대화.

## 2026-10-17 v1.13 — 이미지 생성 호출을 공용 기준 코드 `gemini-image-client`로 (1단계, Claude Code 윈도우)
- **기준 파일 신설** `lib/providers/geminiImage.ts`(+ 테스트 `tests/geminiImage.test.mjs` 6개, `npm run test:gemini-image`). 레퍼런스 어댑터도 시간 제한·재시도·안전 차단 안내가 없어, 장점을 모아 새로 썼다. `lib/providers/adapters/gemini.ts`의 호출부가 모듈로 위임(스타일·한국인 지시문·모델·화질 결정은 그대로).
- 개선: 키를 주소 대신 요청 머리글(`x-goog-api-key`)로, 120초 시간 제한, 서버 오류·일시 혼잡·시간 초과만 1회 재시도, 응답의 모든 조각에서 이미지 탐색, 안전 필터 차단·이미지 없음·한도·키 오류 한국어 안내, 키 가리기. 프롬프트·모델·화질·비율·생성 온도는 그대로.
- 검수: tsc 0, test:gemini-image 6 통과, build, 배포·DB v1.13, 크롬 화면 v1.13. 참고: `test:access`는 핸드폰 필수 정책(2026-10-12) 이후 가짜 회원에 핸드폰이 없어 원래부터 실패 — 이번 변경과 무관, `docs/IMPROVEMENTS.md`에 기록. 실제 이미지 생성 시험은 하지 않음 — 이미지 생성 오류가 나면 그때 테스트 검증(주인님 지시).
- **주의(다음 CLI)**: `geminiImage.ts`는 공용 기준 코드 `gemini-image-client`의 사본이다(기준: `ai-image-studio/lib/providers/geminiImage.ts`). 직접 고치지 않는다. 기준을 고친 뒤 `node scripts/check-shared-modules.mjs --sync` → 사본을 쓰는 프로그램 모두 테스트·빌드·배포·버전 +0.01. 프롬프트·모델·화질·온도는 각 프로그램 값을 넘기는 구조라 모듈에서 바꾸지 않는다. 지도: 루트 `docs/SHARED_FEATURE_MAP.md` §3.

## 2026-10-17 v1.14 — 이미지 생성 모델 목록 통합(공용 기준 코드 `gemini-image-models`) (Claude Code 윈도우)
- 주인님 지시("이미지 생성 모델 사용 관련 기능은 통합, 프로그램마다 다르게 나와야 하면 그때 프로그램별로 보완"). **기준 파일 신설** `lib/providers/nanoBananaModels.ts`(등급별 모델·화질·온도·화면 이름, `resolveImageSize`). 어댑터 `adapters/gemini.ts` 안의 자체 모델 목록을 지우고 이 파일을 쓴다(값은 v1.11과 같아 이 프로그램의 결과물은 변화 없음). 테스트 `tests/nanoBananaModels.test.mjs` 4개 추가(`npm run test:gemini-image` 10개 통과).
- 통합 값(ai-image-studio v1.11 검증값):

| 등급 | 모델 | 기본 화질 | 온도 |
|---|---|---|---|
| nanobanana (1K 경량) | gemini-3.1-flash-lite-image | 1K | 0.7 |
| nanobanana-2-2k | gemini-nano-banana-2.1 | 2K | 0.7 |
| nanobanana-2-4k | gemini-nano-banana-2.1 | 4K | 0.7 |
| nanobanana-pro | gemini-3-pro-image | 4K | 0.4 |

- 호환: 불러오는 이름(`getNanoBananaConfig`·`NanoBananaModelType`·`NANO_BANANA_MODEL_OPTIONS`)·등급 키·옛 등급 이름(`nanobanana-2` → 기본 2K)은 그대로라 저장된 회원 선택값도 그대로 동작. 타입 검사·기존 테스트·빌드·배포·DB 버전 확인. 실제 이미지 생성 시험은 하지 않음 — 오류가 나면 그때 검증(주인님 지시).
- **주의(다음 CLI)**: 모델 설정 파일은 공용 기준 코드 `gemini-image-models`의 사본이다(기준: `ai-image-studio/lib/providers/nanoBananaModels.ts`). 직접 고치지 않는다. 이 프로그램만 결과를 다르게 해야 하면 `getNanoBananaConfig()` 결과를 호출하는 쪽에서 덮어써 보완한다(주인님 지시). 지도: 루트 `docs/SHARED_FEATURE_MAP.md` §3.

## 2026-10-17 v1.15 — 공용 이미지 기준 코드 갱신 반영 (Claude Code 윈도우)
- 기준 `gemini-image-client`(ai-image-studio)이 바뀌어 사본을 `--sync`로 다시 받음: ① 응답에서 **최종** 이미지를 고름 — gemini-3-pro-image가 함께 보내는 중간 초안(`thought: true`) 이미지를 결과로 잘못 쓰던 위험 제거 ② 사용량(usageMetadata) 함께 반환 ③ 선택적 요청 취소 신호(`signal`) 지원(쓰지 않으면 동작 같음). 이 프로그램 코드·프롬프트는 바꾸지 않음.
- 기준 프로그램: `tests/geminiImage.test.mjs`에 최종 이미지 선택·취소 신호 테스트 추가(12개 통과).
- 검수: tsc 0, Vercel 프로덕션 배포·DB 버전, 크롬 화면 버전 확인. 실제 이미지 생성 시험은 하지 않음(주인님 지시).

## 2026-10-17 v1.16 — 이미지 생성 시간 초과 안내 문구 통일 (Claude Code 윈도우)
- 공용 기준 `gemini-image-client`(ai-image-studio)의 시간 초과 안내를 「이미지 생성이 N초 안에 끝나지 않았습니다. 이미지가 이미 만들어졌을 수 있으니 잠시 뒤 결과를 확인한 다음 다시 시도해 주세요.」로 바꿔 사본을 `--sync`로 다시 받음. 시간 초과여도 구글 쪽에서는 이미지가 만들어져 회원 키에 요금이 나갔을 수 있어, 바로 다시 눌러 이중 과금되는 일을 줄이려는 목적이다. 프롬프트·모델·화질·시간 제한 값은 그대로.
- 기준 파일 `lib/providers/geminiImage.ts` 문구 변경 + `tests/geminiImage.test.mjs`에 문구 확인 추가.
- 검수: 기준 테스트 8개 통과(문구 확인 추가), `check-shared-modules` 전부 OK, Vercel 프로덕션 배포·DB 버전, 크롬 화면 버전. 실제 이미지 생성 시험은 하지 않음(비용).

## 2026-10-18 v1.17 — 이미지 시간 초과 자동 재시도 중단(이중 과금 방지) (Claude Code 윈도우)
- 공용 기준 `gemini-image-client`(ai-image-studio)이 **시간 초과(TIMEOUT)는 자동으로 다시 보내지 않도록** 바뀌어 사본을 `--sync`로 다시 받음. 시간 초과여도 구글 쪽에서는 이미지가 만들어져 회원 키에 요금이 나갔을 수 있어, 자동 재시도가 이중 과금의 원인이 될 수 있었다. 서버 오류·혼잡(429)·연결 실패는 그대로 1회 재시도. 프롬프트·모델·화질·시간 제한 값·안내 문구는 그대로이고, 시간 초과 안내가 재시도 대기 없이 더 빨리 뜬다.
- 기준 파일 `lib/providers/geminiImage.ts`: 시간 초과는 바로 오류로 던짐(재시도 루프에서 빠짐), 머리말·옵션 설명 갱신. `tests/geminiImage.test.mjs`: 시간 초과 요청 1회·연결 실패 2회 확인.
- 검수: 기준 테스트 8개 통과(시간 초과 1회 요청·연결 실패 2회 요청 확인), `check-shared-modules` 전부 OK, Vercel 프로덕션 배포·DB 버전, 크롬 화면 버전. 실제 이미지 생성 시험은 하지 않음(비용).

## 2026-10-18 v1.18 — 이미지 시간 초과 안내를 「Google 사용량 확인」으로 정정 (Claude Code 윈도우)
- 공용 기준 `gemini-image-client`(ai-image-studio)의 시간 초과 안내를 정정해 사본을 `--sync`로 다시 받음: 「…결과를 받지 못했습니다. 구글 쪽에서는 이미 생성되어 요금이 나갔을 수 있으니, 바로 다시 누르기 전에 Google AI Studio 사용량(https://aistudio.google.com/usage)을 확인해 주세요.」 이전 문구 「잠시 뒤 결과를 확인」은 틀린 안내였다 — 시간 초과는 우리 서버가 요청을 끊는 것이라 이미지가 프로그램(보관함 등)에 저장되지 않고, 회원이 확인할 수 있는 것은 본인 Google 사용량(요금)뿐이다.
- 기준 파일 `lib/providers/geminiImage.ts` 문구·주석 정정, `tests/geminiImage.test.mjs` 확인 문구를 사용량 주소로.
- 검수: 기준 테스트 8개 통과(사용량 주소 포함 확인), `check-shared-modules` 전부 OK, Vercel 프로덕션 배포·DB 버전, 크롬 화면 버전. 실제 이미지 생성 시험은 하지 않음(비용).

## 2026-10-18 — `test:access` 실패 해결: 시험 데이터를 핸드폰 필수 정책에 맞춤 (Claude Code 윈도우, 시험 파일만 변경·버전·배포 없음)
- 증상: `npm run test:access`의 2번 검사(FREE 프로그램은 가입 회원이면 통과)가 실패.
- 원인: 2026-10-12 핸드폰 번호 필수 정책(판정 순서 정지 → 관리자 → **핸드폰** → FREE …)이 들어갈 때 `scripts/test-access.cjs`의 시험 회원에 `phone`이 없어, 정책대로 `phone_required`로 막힘. 실제 판정 코드는 정상.
- 해결: 일반 시험 회원에 핸드폰 번호를 넣고, 번호 없는 회원(`member-nophone`)은 FREE여도 403 「핸드폰」인지 확인하는 검사(2-1) 추가 → `access ok`. `test:gemini-image` 12개 통과.

<!-- DETAILED_PROGRAM_REVIEW_20261019 -->
## 2026-10-19 Codex — 프로그램별 상세 개선 분석(구현 아님)

[세부 개선안·필요 이유·근거·시험 조건](docs/DETAILED_REVIEW_20261019.md) · [전체 83개 분석](../docs/program-reviews-20261019/INDEX.md) · [공통 아이디어 표](../docs/PROGRAM_IDEA_BACKLOG.md). 이 프로그램 3개 검토 항목입니다. 코드·DB·환경변수·배포는 바꾸지 않았습니다. 작업 전 최신 개선 원장·ACTIVE_WORK와 대조하고 이미 해결된 기능은 보존합니다. 후속 작업 후 처리 ID·증거·미완료·새 인사이트·프로그램 링크를 기록합니다.
<!-- /DETAILED_PROGRAM_REVIEW_20261019 -->

## 2026-10-20 v1.19 — 사용 매뉴얼 메뉴 위치 변경 (Codex)
- 기존 상단 매뉴얼 배너를 화풍 프롬프트 게시판 아래, API키등록·플랫폼연동 바로 위로 이동했습니다. 디자인과 /guide 이동은 같습니다.
- 계획·검수·운영 결과: [인수인계](docs/IMPROVEMENT_HANDOFF_20261020_MANUAL_MENU.md).

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

## 2026-10-21 v1.23 — 생성 이미지 저장소 비공개 + 30일 정리 cron (Claude Code 윈도우)
- 배경: 이미지 카테고리 병합 분석([보고서](../docs/analysis-image-consolidation-20261021/REPORT.md))에서 결과 버킷 `ai-image-generations`가 공개(주소만 알면 누구나 열림)이고, 30일 삭제가 cron 없이 **아무 회원이 갤러리를 열 때 전체 회원분을 지우는** 방식이라는 점을 발견 → 주인님 결정으로 병합보다 먼저 보강.
- 코드: `lib/imageStorage.ts`(경로 추출·서명 주소 24시간). 생성(`app/api/generate`)은 기록에 `image_path`만 남기고 응답은 서명 주소(업로드 실패 시만 공급사 주소를 `image_url`로). 갤러리는 30일 이내 본인 기록만, 서명 주소로 표시(옛 기록은 공개 주소에서 경로 추출). 삭제 API는 본인 폴더 경로만 지움. 정리는 `app/api/cron/cleanup`(Vercel cron 매일 03:00 KST, `Authorization: Bearer CRON_SECRET`, 비밀값 비면 거부) — 파일 먼저 지우고 기록 삭제, 500건씩 최대 20회.
- 환경변수 추가(승인): `CRON_SECRET`(Production, Sensitive, 임의값·출력 안 함). `vercel.json` 새로 만듦(framework nextjs + crons).
- 운영 DB: 버킷 `public=false`, `programs.version='v1.23'`(기록 `supabase/migrations/20261021_v1_23_private_bucket.sql`, 서버 키 스크립트로 적용).
- 검수: tsc·build·시험 34개 통과, 배포 Ready, 정리 주소 비밀값 없음 401, 옛 공개 주소 400·서명 주소 200, 크롬 일반 회원 갤러리 기존 3장 + 새 1장 모두 서명 주소로 표시·다운로드 방식(fetch→blob) 200. 새 저장 경로 확인용 생성 1회(`gemini-3.1-flash-lite-image` 1K, 시험 계정 본인 키, 약 $0.034).
- 남은 일: 정상 비밀값으로 cron 실제 실행은 첫 예약 실행(다음 날 03:00 KST) 뒤 Vercel 로그로 확인. 미사용 표 `user_image_generations`(0012)·함수(0014)는 그대로 둠(정리 여부는 다음 작업). 회원이 밖에 붙여 둔 옛 공개 이미지 링크는 열리지 않음(승인된 영향).

## 2026-10-21 v1.24 — 「바나나 캔버스로 보내 편집」 버튼 (Claude Code 윈도우)
- `lib/bananaLink.ts`: 결과 주소가 우리 저장소(`ai-image-generations`) 서명 주소일 때만 `https://banana-canvas.buylife.xyz/studio?import=<서명 주소>` 링크를 만듦(공급사 주소로 남은 옛 기록은 버튼 없음). 결과 화면(`ImageResultViewer`)·갤러리 카드(🍌)·크게 보기 창에 새 창 링크. 바나나 캔버스 `api/import`가 본인 폴더만 받아 원본으로 넣음(banana-canvas v1.14).
- 검수: tsc·시험 34개·build, 배포 Ready, DB v1.24. 크롬(관리자 계정, 본인 키) 1장 생성(`gemini-3.1-flash-lite-image`) → 갤러리 🍌 링크 → 바나나 캔버스 원본으로 들어옴 확인.

## 2026-10-22 v1.25 — Ideogram·Recraft 11개 모델 호출 연결 (Claude Code 윈도우, 이미지 재비교 W1)
- 원인: 모델 목록 `lib/providers/registry.ts`에는 Ideogram 7·Recraft 4 = 11개 모델이 있지만 실제 호출 담당을 묶은 `lib/providers/index.ts`의 adapters에 `ideogram`·`recraft`가 없어, 고르면 `Unsupported provider` 오류였음. 두 공급자는 `apiKeyProvider: "replicate"`이고 `ReplicateAdapter`에 이미 전용 옵션 처리(`style_type`·`magic_prompt_option`·`rendering_speed`·`character_reference_image`·`style`·`size`)가 있어 두 줄 등록으로 해결.
- 사전 확인(무료): 11개 모델 이름 모두 Replicate 공개 페이지 200, 입력 규격(`/api/schema`)에서 기본값 「None」(resolution)·「Not set」(aspect_ratio)이 실제 허용 값임을 확인.
- 재발 방지 시험 `tests/providerAdapters.test.mjs`(`npm run test:providers`): 목록의 모든 공급자에 호출 담당이 있는지 대조 — 수정 전 코드에서는 「호출 담당 없음: ideogram, recraft」로 실패함을 확인.
- 검수: 시험 15개(providers+gemini-image)·화풍 18개 통과, tsc 0, build, 배포 `ai-image-studio-kkrhcnqm4` Ready, DB v1.25. 크롬(시험 회원 계정) Ideogram v3 Turbo 1장 시도 → 서버 오류 없이 **Replicate까지 요청 도달**, Replicate가 401(시험 계정에 등록된 Replicate 키 만료/무효)로 거절 → 생성·비용 없음. **실제 1장 생성 확인은 유효한 Replicate 키로 다시 해야 함**(관리자 로그인 또는 시험 계정 키 재등록). → **2026-10-22 주인님이 시험 계정 Replicate 키 재등록 후 재시험: Ideogram v3 Turbo 1장 생성 성공**(1024×1024, 「HELLO TEST」 글자 정확, 비공개 버킷 서명 주소 표시, 바나나로 보내기 버튼 표시, 비용 약 $0.03). Recraft는 같은 경로라 실호출 생략.
- 그대로 둔 것: 쓰지 않는 `adapters/fal.ts`, 목록에 없는 `adapters/stability.ts`(import만) — 동작 영향 없음, 정리는 별도 판단.

## 2026-10-22 — AI 동영상 공용 기준 코드 `ai-video-*` 등록(코드만, 미배포) (Claude Code 윈도우)
- `lib/video/videoModels.ts`·`videoParse.ts`·`videoProviders.ts`가 기준(사본: `shorts-onestop-studio/src/lib/`·`shots/src/lib/video/`). 이 프로그램 화면에서는 아직 쓰지 않아 동작 변화 없음 → 다음 배포 때 함께 나가며 버전도 그때. **영상 모델·업체 주소가 바뀌면 여기를 먼저 고치고 `node scripts/check-shared-modules.mjs --sync`**(이미지 모델과 같은 원칙). 상세 `docs/SHARED_MODULES.md`.

## ✅ v1.26 배포 (2026-10-22, Claude Code 윈도우) — 보낸 곳 안내·돌아가기·생성 기록
- 다른 프로그램이 `/dashboard?prompt=…&src=<프로그램>`으로 보내면 대시보드에 「「○○」에서 보낸 프롬프트를 2단계 칸에 채웠습니다 · ↩ ○○ 화면으로 돌아가기」(`data-prompt-source`). 이름·주소 표는 공용 사본 `lib/bananaIdeaLink.ts`(공용 기준 코드 `banana-idea-link`, 기준 `style-dna-analyzer/src/lib/dna/bananaIdeaLink.ts` — **직접 고치지 않음**)의 `BANANA_SOURCES`, 판정은 `lib/promptSource.ts`.
- 생성 요청(`components/Step2PlatformGenerator.tsx`)에 `ideaSource`를 싣고, `/api/generate`가 정해 둔 이름만 받아 `usage_logs.metadata.ideaSource`에 저장(DB 칸 추가 없음). 메인 관리자 통계 카드의 「AI 이미지 스튜디오 · 보낸 프롬프트로 만든 생성」이 이 값을 센다.
- 지금 보내는 곳: 이미지 스타일 분석기(v1.36부터 `&src=style-dna-analyzer`).
- 검수: 새 시험 `npm run test:prompt-source` 2개, 기존 `test:custom-prompts` 18개, tsc·빌드. 크롬: 안내·밑줄 돌아가기 링크·2단계 칸 채움, `/api/generate`를 가로채(생성 안 함) 요청에 `ideaSource: "style-dna-analyzer"` 확인.

## ✅ v1.27 배포 (2026-10-22, Claude Code 윈도우) — 첫 다운로드·바나나로 보낸 시각 기록
- `/api/generate`가 그림마다 생성 기록 번호(`usage_logs.id`)를 `logId`(첫 장)·`images[].logId`로 돌려준다(`insert(...).select("id").single()`).
- 결과 보기(`components/ImageResultViewer.tsx`)·갤러리(`components/GalleryClient.tsx`)의 「다운로드」·「바나나로 보내 편집」을 처음 누르면 `markLog(id, "download" | "banana")`(`lib/logMark.ts`, 같은 화면에서 한 번만, `keepalive`) → 새 API `POST /api/gallery/mark` `{id, kind}`가 **본인·이미지 스튜디오·image_generation 기록만** 찾아 `metadata.downloadedAt`·`metadata.handoffs.banana`가 비어 있을 때만 시각 저장(UUID·종류 검사, 없는 기록 404). DB 칸 추가 없음.
- 공용 사본 `lib/bananaIdeaLink.ts`에 `imageStudioLink(prompt, src)`가 생김(기준 스타일 분석기, 직접 고치지 않음).
- 메인 관리자 카드 「AI 이미지 스튜디오」 표에 「다운로드까지」·「바나나로 넘김」 칸.
- 검수: `test:prompt-source` 3개, tsc·빌드. 크롬: `/api/gallery/mark` 없는 번호 404·잘못된 종류/형식 400(회원 데이터 변경 없음). 실제 다운로드·바나나 클릭 뒤 기록은 미확인(파일 내려받기·실제 생성 필요).

## 2026-10-22 (버전 변경 없음·미배포, Claude Code 윈도우) — 공용 `link-mark` 사본 사용
- `lib/linkMark.ts`(공용 기준 코드 `link-mark` 사본, 기준 바나나 — 직접 고치지 않음) 추가. `/api/gallery/mark`가 `pickAllowed`·`onceMarkNext`, `lib/logMark.ts`가 `createOnceSender`를 씀(동작 같음). 시험 3개 통과. 동작이 같아 배포하지 않음 — 다음 배포 때 함께.

## 2026-10-22 (버전 변경 없음·미배포, Claude Code 윈도우) — 공용 `link-mark` 사본 갱신
- 기준(바나나)의 이름표 2개·`back` 문구 추가분을 사본 `lib/linkMark.ts`에 반영(이 프로그램은 이름표를 쓰지 않아 동작 같음). tsc 통과. 다음 배포 때 함께.

## 🟡 미배포 대기 (2026-10-22, Claude Code 윈도우, 버전 그대로 v1.27) — 갤러리 형식 바꾸기 · 변환 스튜디오에서 다시 저장 받기
- `lib/convertLink.ts`·갤러리 🔁 링크, `app/api/import-result/route.ts`(공용 `resave-receiver` 사본, `usage_logs` action `image_import`, 본인 폴더 `<회원>/<uuid>.<ext>`), `link-mark` 사본 갱신. 시험 `test:prompt-source` 4개·tsc·로컬 빌드. 상세: `docs/IMPROVEMENTS.md` 맨 위, 루트 `docs/PENDING_DEPLOYS.md`.

## ✅ v1.28 배포 — 2026-10-23 대기분 정리 배포(Claude Code 윈도우, 이미지 연계 세션)
- 함께 나간 대기: 갤러리 카드·큰 보기 창 「🔁 형식 바꾸기」(`lib/convertLink.ts`), 새 API `/api/import-result`(`usage_logs` `image_import`), 갤러리 「🔁 변환됨 · WEBP」 배지(`action` 전달), `resave-receiver`·`link-mark` 사본. 크롬(관리자 계정): 카드·큰 보기 창 링크, 변환 스튜디오 받기, 다시 저장 → 갤러리 「변환됨 · WEBP」·이름(프롬프트 앞부분) 확인 후 삭제. 발견: 다시 저장 카드의 플랫폼 배지가 영문 「IMAGE-CONVERT-STUDIO」(IMPROVEMENTS에 기록).
