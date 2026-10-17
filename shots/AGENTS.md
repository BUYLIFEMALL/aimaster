# 🤖 AI Agent 협업 가이드라인 (AGENTS.md)

이 문서는 **AIMaster Shorts (유튜브 롱폼 ➔ 숏폼 콘텐츠 자동화 & Content Factory)** 프로젝트에서 AI Agent(Antigravity, Claude Code, Codex 등)가 협업할 때 준수해야 할 필수 가이드라인 및 규칙입니다.

---

## 🛡️ 에이전트 실행 및 안전 수칙 (Mandatory Rules)

### 1. 자율 진행 허용 작업
다음 작업은 사용자 사전 승인 없이 자율적으로 수행합니다:
- 파일 생성 및 코드 수정
- 패키지 설치 (`npm`, `pip` 등)
- 로컬 테스트 및 빌드 실행

### 2. 사전 승인 필수 작업 (🚨 승인 없이 금지)
> **2026-10-16 주인님 지시로 정리**: Git 커밋·푸시와 프로덕션 배포는 **사전 승인 없이** 메인 지침(`CLAUDE.md` 원칙 12 「작업 완료 절차」: 검수 → 커밋 → 푸시 → 배포 → 배포 후 확인 → 결과·라이브 링크 보고)대로 진행한다. 초기 템플릿에 있던 「Git push·배포 사전 승인」은 폐지. 아래 항목만 여전히 사전 승인이 필요하다.
다음 6가지 작업은 실행하기 전 **반드시 사용자에게 명확히 확인 및 승인**을 받으세요:
1. **파일이나 폴더 삭제**
2. **데이터베이스 마이그레이션 또는 데이터 삭제**
3. **환경변수와 API 키 변경**
4. **유료 API 호출**

---

## 🎯 프로젝트 목적
AI로 유튜브 쇼츠(세로형 숏폼)를 처음부터 끝까지 자동 생성·게시하는 마케팅 자동화 모듈입니다. 주제 수집부터 유튜브/인스타그램 게시까지 사람이 검토·수정하며 순서대로 진행하는 파이프라인 구조입니다.

---

## 📂 프로젝트 작업 디렉토리
* **메인 모듈 경로**: `shots/`
* 모든 쇼츠 자동화 관련 소스 코드(Next.js App Router), API 라우트, 서버 액션은 `shots/` 폴더 내에서 개발 및 관리합니다.

---

## 🏗️ 실제 파이프라인 (좌측 메뉴 순서와 동일, 1~5단계)

| 단계 | 화면 | 주요 기능 |
| :--- | :--- | :--- |
| **1** | **최신 쇼츠 주제 수집** (`/candidates`) | HTTP(특정 URL) / RSS(NewsBlur) / Perplexity(트렌드 검색) 중 하나로 쇼츠 주제 후보(제목·본문·키워드) 자동 수집 |
| **2** | **영상스크립트 생성** (`/scripts`, `/scripts/[id]`) | 후보로 전체 스토리(쇼츠 스토리) + 6장면 대사·이미지 프롬프트 + BGM 프롬프트를 AI로 생성, 화면에서 검토·수정 |
| **3** | **이미지 생성** (`/images`) | 장면별 이미지 프롬프트로 나노바나나(Gemini 이미지) 9:16 이미지 생성, 장면당 이력 관리 후 선택 |
| **4** | **음악 생성** (`/music`) | Suno로 배경음악 생성 (Style Description/Exclude Styles는 영어로 작성해야 함), 생성 이력 중 선택 |
| **5** | **영상 포스팅** (`/videos`) | JSON2Video로 이미지+내레이션(ElevenLabs)+BGM+자막을 합쳐 최종 영상 렌더링 → 유튜브 쇼츠/인스타그램 릴스에 업로드 |

인스타그램과 유튜브 모두 회원마다 본인 OAuth 앱(Meta App ID/Secret, Google OAuth Client ID/Secret)을 설정 페이지에 직접 등록하는 BYOK 방식이다. 예전엔 인스타그램만 buylife 소유의 Meta 앱 하나로 모든 사용자를 받았으나(2026-09-16 이전), 그 앱이 Meta Development 모드라 앱의 Tester로 등록된 계정(운영자 본인)만 OAuth를 완료할 수 있어 다른 회원은 연결이 불가능한 문제가 있었다. 같은 날 threads/threads-affiliate-poster에서 먼저 고친 것과 동일하게, 회원마다 본인 Meta 앱의 App ID/Secret을 설정 페이지에서 등록(`user_api_keys`의 `meta_app_id`/`meta_app_secret`)하고 `resolveApiKey()`로 조회해서 쓰도록 전환했다(`src/lib/instagram/client.ts`가 `appId`/`appSecret`을 파라미터로 받음). 기존 `META_APP_ID`/`META_APP_SECRET` env var는 Vercel에 남아있지만 코드에서는 더 이상 읽지 않는다.

---

## 🔗 AIMaster 플랫폼 공통 원칙

shots는 AIMaster 저장소 안의 서브프로젝트다. 개발/유지보수 시 루트의 `../CLAUDE.md`를 **메인 지침**으로 반드시 함께 읽을 것 — "Communication"(답변은 쉬운 한글로 작성), "Platform-hub 구조", "멀티테넌시 원칙" 섹션을 포함한 전체 내용이 이 서브프로젝트에도 그대로 적용된다. 핵심 요약:

- shots는 개발자 전용 도구가 아니라, AIMaster 회원 중 이 프로그램(`programs.slug = "auto-shorts-posting"`) 이용 권한(구독/개별부여/등급)이 있는 모든 사용자가 각자 자신의 계정으로 동일하게 쓸 수 있어야 한다.
- 페이지/레이아웃은 `requireProgramAccess()`(권한 없으면 redirect), API route는 반드시 redirect 대신 결과 객체를 반환하는 방식으로 로그인 여부뿐 아니라 프로그램 이용 권한까지 확인한다.
- 사용자 소유 데이터 테이블은 `user_id` + RLS owner-only 정책으로 격리한다 (`shorts_candidates`, `shorts_videos`, `newsblur_accounts`, `youtube_accounts`, `instagram_accounts`, `user_api_keys` 참고).
- API 키는 공용 `user_api_keys` 테이블(`resolveApiKey()`)에서 **로그인한 회원 본인 키만** 쓴다(2026-10-09 v1.04: 앱 기본 키·환경변수 폴백 삭제 — 최상위 규칙 `docs/TOP_RULE_PERSONAL_ACCOUNT_API.md`). 키가 없으면 null이므로 호출부는 "설정에서 본인 키를 등록해주세요" 안내를 보여준다.

## 작업 기록
- 2026-10-10 v1.05: 로그인 화면(`src/app/(auth)/layout.tsx`) 제목을 "YOUTUBE Shots 자동화" + 줄바꿈 + "(이미지 스토리)" 두 줄로 변경(기존엔 "스토/리"처럼 글자 중간에서 줄이 꺾임). 마이그레이션 `20261010100000_bump_version_v1_05.sql`.
- 2026-10-10 v1.06: 로그인 쿠키 도메인 공유(파일럿). `src/lib/supabase/cookieDomain.ts`(host 가 *.buylife.xyz 일 때만 `.buylife.xyz`), `client.ts`/`server.ts`/`src/proxy.ts` 에 적용. `*.vercel.app` 주소에서는 기존과 동일(도메인 미지정). 마이그레이션 `20261010120000_bump_version_v1_06.sql`.
- 2026-10-10 v1.07: 좌측 사이드바(`src/components/layout/Sidebar.tsx`) 제목을 "YOUTUBE Shots 자동화" + 줄바꿈 + "(이미지 스토리)" 두 줄로 줄바꿈 처리. 마이그레이션 `20261010130000_bump_version_v1_07.sql`.
- v1.08 (2026-10-12): 핸드폰 번호 필수 정책 적용 — 핸드폰 번호가 없는 회원(관리자 제외)은 이용할 수 없고 메인 사이트 설정에서 번호를 등록하도록 안내합니다. 공용 규칙은 루트 `lib/utils/phone.ts`, 상세는 `docs/HANDOFF.md` 2026-10-12 항목.


## 2026-10-16 DB 연동 변수 호환 — v1.09 (auto-shorts-posting)

작업 전 [최상위 데이터베이스 연동 지침](../docs/DATABASE_CONNECTION_POLICY.md)과 [전체 전환 인수인계](../docs/DATABASE_CONNECTION_HANDOFF.md)를 먼저 읽습니다. 공개 키는 새 PUBLISHABLE 이름 우선·기존 ANON 이름 호환, 서버 키는 새 SECRET 이름 우선·기존 SERVICE_ROLE 이름 호환입니다. 새 값 없음/공백일 때만 같은 종류의 기존 값을 사용하며, 인증 실패 후 다른 키로 재시도하지 않습니다. 기존 변수·실제 키·회원 권한·Cron은 유지합니다. 배포·회원 검수 결과는 전체 인수인계의 프로그램별 기록에서 확인합니다. 기존 변수 삭제와 실제 키 폐기는 별개이며 안정화 확인 전 삭제하지 않습니다.

## v1.10 (2026-10-17) 이미지 모델 최신 교체 — Claude Code(윈도우)
- `src/lib/ai/nanoBananaModels.ts` : 구형(gemini-2.5-flash-image·gemini-3.1-flash-image·*-preview·Imagen) → 최신 정식(`gemini-nano-banana-2.1`·`gemini-3-pro-image`), 주소 v1beta (기준: ai-image-studio v1.11 `lib/providers/adapters/gemini.ts`).
- 실제 이미지 생성 시험은 하지 않았습니다 — 이미지 생성 오류가 나면 그때 테스트 검증합니다(주인님 지시).

## 2026-10-17 v1.11 — 이미지 생성 호출을 공용 기준 코드 `gemini-image-client`로 (1단계, Claude Code 윈도우)
- `src/lib/ai/geminiImage.ts`(사본) 추가, `src/lib/ai/script.ts` `generateSegmentImage()`(9:16 장면 이미지)가 모듈로 위임. 같은 파일의 글 생성 오류 처리(`describeGeminiError`)는 그대로.
- 개선: 키를 주소 대신 요청 머리글(`x-goog-api-key`)로, 120초 시간 제한, 서버 오류·일시 혼잡·시간 초과만 1회 재시도, 응답의 모든 조각에서 이미지 탐색, 안전 필터 차단·이미지 없음·한도·키 오류 한국어 안내, 키 가리기. 프롬프트·모델·화질·비율·생성 온도는 그대로.
- 검수: tsc·eslint 0, test:api-keys 통과, build, 배포·DB(`auto-shorts-posting`) v1.11, 크롬 화면 v1.11. 실제 이미지 생성 시험은 하지 않음 — 이미지 생성 오류가 나면 그때 테스트 검증(주인님 지시).
- **주의(다음 CLI)**: `geminiImage.ts`는 공용 기준 코드 `gemini-image-client`의 사본이다(기준: `ai-image-studio/lib/providers/geminiImage.ts`). 직접 고치지 않는다. 기준을 고친 뒤 `node scripts/check-shared-modules.mjs --sync` → 사본을 쓰는 프로그램 모두 테스트·빌드·배포·버전 +0.01. 프롬프트·모델·화질·온도는 각 프로그램 값을 넘기는 구조라 모듈에서 바꾸지 않는다. 지도: 루트 `docs/SHARED_FEATURE_MAP.md` §3.

## 2026-10-17 v1.12 — 이미지 생성 모델 목록 통합(공용 기준 코드 `gemini-image-models`) (Claude Code 윈도우)
- 주인님 지시("이미지 생성 모델 사용 관련 기능은 통합, 프로그램마다 다르게 나와야 하면 그때 프로그램별로 보완"). `src/lib/ai/nanoBananaModels.ts`를 공용 모델 목록 사본으로 교체(`NANO_BANANA_MODEL_OPTIONS` 화면 이름은 공용 이름으로 바뀜).
- 통합 값(ai-image-studio v1.11 검증값):

| 등급 | 모델 | 기본 화질 | 온도 |
|---|---|---|---|
| nanobanana (1K 경량) | gemini-3.1-flash-lite-image | 1K | 0.7 |
| nanobanana-2-2k | gemini-nano-banana-2.1 | 2K | 0.7 |
| nanobanana-2-4k | gemini-nano-banana-2.1 | 4K | 0.7 |
| nanobanana-pro | gemini-3-pro-image | 4K | 0.4 |

- 이 프로그램에서 바뀐 값: 1K 등급 → `gemini-3.1-flash-lite-image`, **Pro 등급 모델 `gemini-nano-banana-2.1` → `gemini-3-pro-image`**(1장 가격 4K 약 $0.113 → $0.24로 오름 — 회원 본인 키 부담). 장면 이미지는 9:16·2K 기본 그대로.
- 호환: 불러오는 이름(`getNanoBananaConfig`·`NanoBananaModelType`·`NANO_BANANA_MODEL_OPTIONS`)·등급 키·옛 등급 이름(`nanobanana-2` → 기본 2K)은 그대로라 저장된 회원 선택값도 그대로 동작. 타입 검사·기존 테스트·빌드·배포·DB 버전 확인. 실제 이미지 생성 시험은 하지 않음 — 오류가 나면 그때 검증(주인님 지시).
- **주의(다음 CLI)**: 모델 설정 파일은 공용 기준 코드 `gemini-image-models`의 사본이다(기준: `ai-image-studio/lib/providers/nanoBananaModels.ts`). 직접 고치지 않는다. 이 프로그램만 결과를 다르게 해야 하면 `getNanoBananaConfig()` 결과를 호출하는 쪽에서 덮어써 보완한다(주인님 지시). 지도: 루트 `docs/SHARED_FEATURE_MAP.md` §3.

## 2026-10-17 v1.13 — 공용 이미지 기준 코드 갱신 반영 (Claude Code 윈도우)
- 기준 `gemini-image-client`(ai-image-studio)이 바뀌어 사본을 `--sync`로 다시 받음: ① 응답에서 **최종** 이미지를 고름 — gemini-3-pro-image가 함께 보내는 중간 초안(`thought: true`) 이미지를 결과로 잘못 쓰던 위험 제거 ② 사용량(usageMetadata) 함께 반환 ③ 선택적 요청 취소 신호(`signal`) 지원(쓰지 않으면 동작 같음). 이 프로그램 코드·프롬프트는 바꾸지 않음.
- 검수: tsc 0, Vercel 프로덕션 배포·DB 버전, 크롬 화면 버전 확인. 실제 이미지 생성 시험은 하지 않음(주인님 지시).

## 2026-10-17 v1.14 — 이미지 생성 시간 초과 안내 문구 통일 (Claude Code 윈도우)
- 공용 기준 `gemini-image-client`(ai-image-studio)의 시간 초과 안내를 「이미지 생성이 N초 안에 끝나지 않았습니다. 이미지가 이미 만들어졌을 수 있으니 잠시 뒤 결과를 확인한 다음 다시 시도해 주세요.」로 바꿔 사본을 `--sync`로 다시 받음. 시간 초과여도 구글 쪽에서는 이미지가 만들어져 회원 키에 요금이 나갔을 수 있어, 바로 다시 눌러 이중 과금되는 일을 줄이려는 목적이다. 프롬프트·모델·화질·시간 제한 값은 그대로.
- 검수: 기준 테스트 8개 통과(문구 확인 추가), `check-shared-modules` 전부 OK, Vercel 프로덕션 배포·DB 버전, 크롬 화면 버전. 실제 이미지 생성 시험은 하지 않음(비용).

## 2026-10-18 v1.15 — 이미지 시간 초과 자동 재시도 중단(이중 과금 방지) (Claude Code 윈도우)
- 공용 기준 `gemini-image-client`(ai-image-studio)이 **시간 초과(TIMEOUT)는 자동으로 다시 보내지 않도록** 바뀌어 사본을 `--sync`로 다시 받음. 시간 초과여도 구글 쪽에서는 이미지가 만들어져 회원 키에 요금이 나갔을 수 있어, 자동 재시도가 이중 과금의 원인이 될 수 있었다. 서버 오류·혼잡(429)·연결 실패는 그대로 1회 재시도. 프롬프트·모델·화질·시간 제한 값·안내 문구는 그대로이고, 시간 초과 안내가 재시도 대기 없이 더 빨리 뜬다.
- 검수: 기준 테스트 8개 통과(시간 초과 1회 요청·연결 실패 2회 요청 확인), `check-shared-modules` 전부 OK, Vercel 프로덕션 배포·DB 버전, 크롬 화면 버전. 실제 이미지 생성 시험은 하지 않음(비용).

## 2026-10-18 v1.16 — 이미지 시간 초과 안내를 「Google 사용량 확인」으로 정정 (Claude Code 윈도우)
- 공용 기준 `gemini-image-client`(ai-image-studio)의 시간 초과 안내를 정정해 사본을 `--sync`로 다시 받음: 「…결과를 받지 못했습니다. 구글 쪽에서는 이미 생성되어 요금이 나갔을 수 있으니, 바로 다시 누르기 전에 Google AI Studio 사용량(https://aistudio.google.com/usage)을 확인해 주세요.」 이전 문구 「잠시 뒤 결과를 확인」은 틀린 안내였다 — 시간 초과는 우리 서버가 요청을 끊는 것이라 이미지가 프로그램(보관함 등)에 저장되지 않고, 회원이 확인할 수 있는 것은 본인 Google 사용량(요금)뿐이다.
- 검수: 기준 테스트 8개 통과(사용량 주소 포함 확인), `check-shared-modules` 전부 OK, Vercel 프로덕션 배포·DB 버전, 크롬 화면 버전. 실제 이미지 생성 시험은 하지 않음(비용).
