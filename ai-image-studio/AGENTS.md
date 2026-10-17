# AI 이미지 스튜디오 (ai-image-studio) — AI 에이전트 인수인계 문서 (AGENTS.md)

> **공식 서비스 URL**: [https://ai-image-studio.buylife.xyz](https://ai-image-studio.buylife.xyz)  
> **현재 버전**: `v1.12` (크리에이티브 아틀리에 럭셔리 다크 스타일 템플릿)  
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
- **데이터베이스 & 스토리지**: Supabase Auth (SSO `.buylife.xyz` 세션 쿠키), PostgreSQL DB, Supabase Storage (`generated-images` 버킷).
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
