# 네이버 블로그 SEO 스튜디오 개발 지침

> **v1.85 (2026-10-22) BLC-08b 「내 문체」 운영 반영:** 내 글(공개 RSS·붙여 넣은 표본) → 문체 분석 → 서버 승인(지문) → 새 글·자료부터 집필에서 선택 적용(기본 적용 안 함), 원고 `seo_report.style` 기록. 새 표 `naver_blog_seo_styles`. **v1.87: 표본 끝맺음(해요체/합니다체) 자동 판별 → 필수 끝맺음 규칙. 실검수 「~요」 4→29로 개선됐으나 본문 중간부터 합니다체가 섞임(29/29) — v1.88(재검사·재요청)은 생성 실패로 배포 되돌림·패치 보관(docs/patches/), 원인 분리 후 재시도 승인 대기**. [IMPROVEMENTS](docs/IMPROVEMENTS.md) 맨 아래.

> **v1.84 (2026-10-22) BLC-08a 「자료부터 집필」 운영 완료:** 자료 모으기 → 근거 정리(인용 확인) → 서버 승인 → 승인 근거로 글 생성·출처 표시. 기존 새 글·최적화 경로 불변. 새 표 `naver_blog_seo_research`. [플랜](docs/PLAN_20261022_BLC08_GROUNDED_WRITING.md) · [IMPROVEMENTS](docs/IMPROVEMENTS.md) 맨 아래.

> **자동 포스팅 v1.83 운영 검수 완료:** [플랜](docs/PLAN_20261021_AUTO_PUBLISH.md) · [최종 인수인계](docs/IMPROVEMENT_HANDOFF_20261021_AUTO_PUBLISH.md). 코드 `a2fe43f9`·운영 Ready·DB/설치 확장/라이브 ZIP 일치. Edge 지정 일반 회원의 비공개 최종 발행 1건·실제 URL/시각 DB 저장·결과 재확인·웹 생성 기록/재열기와, 별도 원고의 웹 전송→확장 전체 미리보기·4단계/복사/516px 검수 완료. 유료 AI 0. 이미지가 포함된 실제 발행·전체공개·예약은 이번 검수 범위 밖입니다. 다음은 티스토리 자동 포스팅입니다.

> **2026-10-21 블로그 병합 재비교:** 기존 7개 비교표·최신 코드/운영 메타데이터를 대조해 SEO v1.80 독립 유지+검증된 확장 엔진 기준/사본 공유를 추천했습니다. SEO 권한 234명, 사용 기록 0이라 실제 이용 빈도 판단 불가. SEO/티스토리는 현재 마지막 발행 수동으로 새 자동 포스팅 완성 기준의 추가 구현 대상입니다. 이번 제품 코드·DB 쓰기·권한·버전·배포 변경 없음, 유료 호출/최종 발행 0. [근거·남은 단계](docs/IMPROVEMENT_HANDOFF_20261021_COMPARISON.md).

## 프로그램 버전 관리

- 현재 회원용 앱·확장 공개 버전은 `v1.83`이며 `lib/version.ts`의 `APP_VERSION`, 공용 DB `programs.version`, 확장 `manifest.json`의 `version_name`, 다운로드 ZIP을 항상 같은 값으로 변경한다.
- 이 프로젝트를 수정해 배포할 때마다 앱과 확장 공개 버전을 함께 `0.01` 올린다. 메이저 증가는 주인님 지시가 있을 때만 가능하다.
- Chrome 확장 `manifest.json.version`은 Chrome 업데이트 비교용 내부 번호다. 이미 배포된 번호보다 낮출 수 없으므로 항상 증가시키되, 사용자에게 보이는 번호는 반드시 `version_name`의 앱 버전과 일치시킨다. 확장 ZIP도 같은 작업에서 다시 생성한다.

## 이용 권한 (2026-10-01, v1.48)

- `lib/access.ts`(웹)와 `lib/extensionAuth.ts`(크롬 확장 토큰)는 루트 `CLAUDE.md` 핵심 원칙 6번 순서를 따른다:
  정지 → 관리자 → **FREE 배지(가입만 하면 등급 무관 허용)** → 결제 구독 → 최소 등급 없음 → **등급 ≥ 최소 등급 그리고 관리자가 넣어준 사용기간** → 그 외 차단.
- 예전에는 웹이 정지 계정 차단·FREE 배지 처리 없이 `grade_program_access`나 사용기간 하나만으로 허용했고, 확장은 등급만 있어도 허용했다(2026-09-30 정리).
  적용 전 계산: 회원 170명 모두 사용기간+일반 이상이라 막히는 회원 없음.
- 이 변경은 서버 판정만 바꾼 것이라 확장 ZIP·`manifest.json`은 다시 만들 필요가 없었다.

이 문서는 루트 `../CLAUDE.md`, `../AGENTS.md`, `../docs/PLATFORM_PATTERNS.md`를 전제로 하는 신규 프로그램 전용 지침입니다.

## 제품 경계

- 기존 `naver-blog-auto-poster_app` 및 `naver-blog-auto-poster_web`과 코드·프로그램 slug·이용권한을 공유하지 않습니다.
- 이 프로그램은 AI 콘텐츠 기획·생성·검수 도구입니다.
- 입력 전용 조작은 마지막 발행을 직접 누릅니다. 별도 자동 포스팅 조작은 대상/공개 범위 확인 후 실제 발행·결과 기록까지 진행합니다.
- 계정 정지 위험이 있는 대량 댓글·공감·이웃추가·무인 포스팅은 구현하지 않습니다.

## 개발 규칙

- 주제와 기능을 실제 사용자 흐름으로 먼저 확인하고 작은 기능 단위로 구현합니다.
- 기존 네이버 화면을 자동 조작하는 기능을 추가할 경우 실제 DOM 조사 후 구현하며 셀렉터를 추측하지 않습니다.
- 인증·권한 페이지와 API는 `requireProgramAccess()`/`checkProgramAccessApi()`를 사용하고 `force-dynamic` 및 `force-no-store`를 함께 선언합니다.
- 사용자 데이터는 `user_id`와 RLS로 격리합니다.
- AI API는 공용 `user_api_keys`와 `resolveApiKey()`를 사용하며 본인 키가 없으면 설정 안내를 반환합니다.
- 설정 메뉴 라벨은 `API키등록·플랫폼연동`으로 통일하고 하단에 연동 매뉴얼을 둡니다.
- 기능 하나마다 타입 검사, 빌드, 린트, 실제 화면 검수를 진행하고 README에 결과를 기록합니다.

## 현재 단계

초기 골격 단계는 종료됐습니다. AI 초안 생성, 사용자별 API 키, 새 글 만들기별 콘텐츠·이미지 모델 선택, 확장 토큰, Chrome 확장
실제 입력, 나노바나나 이미지 삽입, 발행 설정 카테고리·태그 입력, 본문 일반어를 제외한 추천 태그 추출까지 구현·검증됐습니다. 다음
작업자는 반드시 [CLI_HANDOFF_2026-10-01.md](./CLI_HANDOFF_2026-10-01.md)와 루트
`docs/NAVER_BLOG_EDITOR_AUTOMATION_GUIDE.md`를 함께 읽고 이어서 작업합니다.

## 확장 다운로드 고정 주소 (2026-10-09, v1.61)

- 다운로드 주소를 `/downloads/naver-blog-seo-studio-extension-latest.zip`로 통일했다(빌드가 버전별 ZIP과 함께 `-latest.zip` 사본을 만든다). 설정 화면 카드·`GET /api/extension/whoami`의 `downloadUrl`·DB `extension_download_url`(마이그레이션 `20261009160000_bump_version_v1_61.sql`)이 같은 주소를 쓴다. 기능·확장 코드 변경 없음(ZIP·manifest만 v1.61).

## 확장 새 버전 안내 (2026-10-09, v1.60)

- `GET /api/extension/whoami`가 `latestVersion`(=`APP_VERSION`)과 `downloadUrl`(`/downloads/naver-blog-seo-studio-extension-<버전>.zip`)을 함께 돌려준다. 확장 사이드패널은 연결 상태를 확인할 때 설치된 버전(`manifest.version_name`)보다 높을 때만 상단에 "새 버전이 나왔습니다" 배너와 ZIP 링크를 보여준다(안내 주소는 이 사이트의 `/downloads/` 아래만 허용). 연결(토큰)을 하지 않은 상태에서는 안내가 뜨지 않는다.
- 알림 코드가 들어간 v1.60 이상 확장은 회원이 한 번 직접 다시 설치해야 이후부터 알림이 뜬다(v1.59 이하에는 코드가 없다).
- 이 프로그램은 배포 전에 `npm run extension:archive`로 ZIP을 직접 만들어야 한다(`prebuild`에 연결돼 있지 않다). 배포 후 루트에서 `node scripts/check-extension-release.mjs naver-blog-seo-studio`로 DB·ZIP 버전 일치를 확인한다(`docs/EXTENSION_RELEASE_RULES.md`).
- 검사: `npm run test:update-banner`.

## 카테고리 기능 (2026-10-12, v1.62, Claude Code — 주인님 요청: 다른 블로그 자동화(올인원·ai-auto-blog)의 카테고리를 확장)
- **생성 기록 분류(보관함 분류)**: 회원별 목록 `naver_blog_seo_categories`(RLS owner-only), API `GET/PUT /api/categories`(목록 전체 교체). 글에는 분류 **id**만 `naver_blog_seo_drafts.category_id`로 저장(이름을 바꿔도 유지, 지우면 '미분류'). 글 이동·네이버 카테고리 변경은 `PATCH /api/drafts/[draftId]/category`(본문·이미지는 건드리지 않음). 화면: 결과 화면 [Chrome 확장 전송] 위 `DraftCategoryPanel`, 생성 기록 화면의 카테고리 칩 필터·분류 이동 셀렉트·[카테고리 관리] 모달(`components/categories/*`). 목록이 비어 있으면 기본 6개(생활/살림꿀팁 등)를 보여 주고 처음 편집할 때 저장된다. 복제하면 분류도 복사된다.
- **네이버 발행 카테고리**: 웹에서 [카테고리 불러오기] → 확장이 새 탭에서 발행 설정창만 열어 실제 카테고리(번호·이름)를 읽고 닫는다 → 목록에서 선택 → `naver_blog_seo_drafts.naver_category`(`{id,name}`)에 저장. 기본값은 마지막으로 쓴 카테고리(브라우저 localStorage `naver_blog_seo_naver_category_last_v1`)를 새 글에 자동 선택. 확장은 입력 뒤 발행 설정에서 **번호+이름이 정확히 같을 때만** 그 카테고리를 선택하고(`naver-category-page.js`의 `categorySelect`, ai-auto-blog가 실제 화면에서 확인한 셀렉터 `categoryItemText_<번호>`), 웹에서 고른 값이 없으면 기존 방식(사이드패널 '카테고리명' 입력)을 그대로 쓴다. 입력 전용 조작은 최종 발행을 누르지 않으며, 자동 포스팅 조작의 최종 발행은 별도 검증/실행 경로를 따른다.
- **확장 v1.62**: `web-bridge.js`(content script, 이 사이트 출처만, ping·categories 요청만 전달), `background.js`(서비스 워커가 카테고리 읽기 — 사이트 화면에서 온 요청만 허용), `naver-category-page.js`(네이버 화면 안 명령), 사이드패널이 `/api/extension/drafts/library` 응답의 `naver_category`를 사용. manifest에 content_scripts 추가(새 권한 없음). 옛 확장(v1.61 이하)은 [카테고리 불러오기]에서 버전을 확인해 "ZIP 덮어쓰기" 안내를 보여 준다.
- **미검증**: 실제 네이버 발행 설정창에서 목록 읽기·선택(주인님 PC 확인 필요). 테스트 `npm run test:categories`.
- v1.63 (2026-10-12): 핸드폰 번호 필수 정책 적용 — 핸드폰 번호가 없는 회원(관리자 제외)은 이용할 수 없고 메인 사이트 설정에서 번호를 등록하도록 안내합니다. 공용 규칙은 루트 `lib/utils/phone.ts`, 상세는 `docs/HANDOFF.md` 2026-10-12 항목.


## 2026-10-16 DB 연동 변수 호환 — v1.64 (naver-blog-seo-studio)

작업 전 [최상위 데이터베이스 연동 지침](../docs/DATABASE_CONNECTION_POLICY.md)과 [전체 전환 인수인계](../docs/DATABASE_CONNECTION_HANDOFF.md)를 먼저 읽습니다. 공개 키는 새 PUBLISHABLE 이름 우선·기존 ANON 이름 호환, 서버 키는 새 SECRET 이름 우선·기존 SERVICE_ROLE 이름 호환입니다. 새 값 없음/공백일 때만 같은 종류의 기존 값을 사용하며, 인증 실패 후 다른 키로 재시도하지 않습니다. 기존 변수·실제 키·회원 권한·Cron은 유지합니다. 배포·회원 검수 결과는 전체 인수인계의 프로그램별 기록에서 확인합니다. 기존 변수 삭제와 실제 키 폐기는 별개이며 안정화 확인 전 삭제하지 않습니다.

## 2026-10-16 v1.65 — 새 주소 이전(도메인 통일·옛 vercel.app 삭제 대비) (Claude Code 윈도우)
- 새 주소 `https://naver-blog-seo-studio.buylife.xyz`(`vercel domains add`), `programs.app_url` 새 주소(예전엔 메인 경로 `www.buylife.xyz/naver-blog-seo-studio`). 로그인 쿠키 `.buylife.xyz` 공유(`lib/supabase/cookieDomain.ts` + client·server·`proxy.ts`). `proxy.ts`: 옛 `*.vercel.app` 화면 → 새 주소 308(API·`/downloads` 제외), matcher를 `/dashboard`만 → 전체 화면으로 넓힘.
- 확장 v1.65: `sidepanel.js` BASE·`sidepanel.html` 링크 새 주소, manifest host_permissions·content_scripts·`web-bridge.js`·background 카테고리 요청 검사에 새 주소 추가(옛 주소 유지). ZIP 재생성, DB version/extension_version v1.65·extension_download_url 새 주소, `check-extension-release` OK. 테스트 update-banner 3·categories 2 통과.
- 메인 사이트 `app/(main)/naver-blog-seo-studio/page.tsx` 전달 대상을 새 주소로(메인 배포, `137098a0`).
- 검수: 새 주소 / → /dashboard, 옛 주소 / /login /settings /dashboard 모두 308, API(whoami) 옛·새 주소 401(동작), 크롬에서 재로그인 없이 대시보드 열림(공유 세션이 관리자 계정이라 관리자로 표시). 
- **회원 안내 필요**: 설치된 옛 확장의 web-bridge는 옛 주소에서만 동작 → 화면이 새 주소로 옮겨진 지금은 확장 설치 확인·카테고리 읽기가 새 확장(v1.65)에서만 동작. ZIP 다시 받기 → 덮어쓰기 → 새로고침.

## v1.66 (2026-10-17) 이미지 모델 최신 교체 — Claude Code(윈도우)
- `lib/ai/nanoBananaConfig.ts` : 구형(gemini-2.5-flash-image·gemini-3.1-flash-image·*-preview·Imagen) → 최신 정식(`gemini-nano-banana-2.1`·`gemini-3-pro-image`), 주소 v1beta (기준: ai-image-studio v1.11 `lib/providers/adapters/gemini.ts`).
- 실제 이미지 생성 시험은 하지 않았습니다 — 이미지 생성 오류가 나면 그때 테스트 검증합니다(주인님 지시).

## 2026-10-17 v1.67 — 이미지 생성 호출을 공용 기준 코드 `gemini-image-client`로 (1단계, Claude Code 윈도우)
- `lib/ai/geminiImage.ts`(사본) 추가, `lib/ai/nanoBanana.ts` `generateNanoBananaImage()`가 모듈로 위임(예전 `describeGeminiFailure` 삭제 — 모듈이 키를 가린 한국어 안내).
- 개선: 키를 주소 대신 요청 머리글(`x-goog-api-key`)로, 120초 시간 제한, 서버 오류·일시 혼잡·시간 초과만 1회 재시도, 응답의 모든 조각에서 이미지 탐색, 안전 필터 차단·이미지 없음·한도·키 오류 한국어 안내, 키 가리기. 프롬프트·모델·화질·비율·생성 온도는 그대로.
- 검수: tsc·eslint 0, test:categories·update-banner 통과, 확장 manifest 1.67.0/v1.67·ZIP 재생성(예전 v1.66 ZIP 삭제), build, 배포·DB v1.67, `check-extension-release` OK, 크롬 화면 v1.67. 회원 확장 ZIP 다시 받기 안내 필요. 실제 이미지 생성 시험은 하지 않음 — 이미지 생성 오류가 나면 그때 테스트 검증(주인님 지시).
- **주의(다음 CLI)**: `geminiImage.ts`는 공용 기준 코드 `gemini-image-client`의 사본이다(기준: `ai-image-studio/lib/providers/geminiImage.ts`). 직접 고치지 않는다. 기준을 고친 뒤 `node scripts/check-shared-modules.mjs --sync` → 사본을 쓰는 프로그램 모두 테스트·빌드·배포·버전 +0.01. 프롬프트·모델·화질·온도는 각 프로그램 값을 넘기는 구조라 모듈에서 바꾸지 않는다. 지도: 루트 `docs/SHARED_FEATURE_MAP.md` §3.

## 2026-10-17 v1.68 — 이미지 생성 모델 목록 통합(공용 기준 코드 `gemini-image-models`) (Claude Code 윈도우)
- 주인님 지시("이미지 생성 모델 사용 관련 기능은 통합, 프로그램마다 다르게 나와야 하면 그때 프로그램별로 보완"). `lib/ai/nanoBananaConfig.ts`를 공용 모델 목록 사본으로 교체(사본에는 `server-only`가 없지만 키·비밀값이 없는 목록이라 문제없음).
- 통합 값(ai-image-studio v1.11 검증값):

| 등급 | 모델 | 기본 화질 | 온도 |
|---|---|---|---|
| nanobanana (1K 경량) | gemini-3.1-flash-lite-image | 1K | 0.7 |
| nanobanana-2-2k | gemini-nano-banana-2.1 | 2K | 0.7 |
| nanobanana-2-4k | gemini-nano-banana-2.1 | 4K | 0.7 |
| nanobanana-pro | gemini-3-pro-image | 4K | 0.4 |

- 이 프로그램에서 바뀐 값: 1K 등급 → `gemini-3.1-flash-lite-image`, Pro 온도 0.7 → 0.4. 확장 manifest 1.68.0/v1.68·ZIP 재생성.
- 호환: 불러오는 이름(`getNanoBananaConfig`·`NanoBananaModelType`·`NANO_BANANA_MODEL_OPTIONS`)·등급 키·옛 등급 이름(`nanobanana-2` → 기본 2K)은 그대로라 저장된 회원 선택값도 그대로 동작. 타입 검사·기존 테스트·빌드·배포·DB 버전 확인. 실제 이미지 생성 시험은 하지 않음 — 오류가 나면 그때 검증(주인님 지시).
- **주의(다음 CLI)**: 모델 설정 파일은 공용 기준 코드 `gemini-image-models`의 사본이다(기준: `ai-image-studio/lib/providers/nanoBananaModels.ts`). 직접 고치지 않는다. 이 프로그램만 결과를 다르게 해야 하면 `getNanoBananaConfig()` 결과를 호출하는 쪽에서 덮어써 보완한다(주인님 지시). 지도: 루트 `docs/SHARED_FEATURE_MAP.md` §3.

## 2026-10-17 v1.69 — 파일 나누기 + 디자인 리뉴얼(라이트·네이버 그린) (Claude Code 맥미니)
- `StudioPage.tsx` 928줄 → `components/studio/`(useStudio 훅·공통·화면 5개, 동작 동일 검증). 공용 사이드바 `StudioSidebar.tsx`(실제 동작하는 로그아웃·휴대폰 ☰·📖), `/guide` 신설, 설정의 옛 사이드바 2개 제거, 「AIMaster 계정 연동 전」 고정 문구 → 로그인 계정. 확장 화면 변경 없음, `manifest` 1.69.0/v1.69. 디자인: [docs/DESIGN_HANDOFF.md](docs/DESIGN_HANDOFF.md)
- **확장 ZIP·빌드·배포는 윈도우 CLI 대기.** 화면은 이제 `components/studio/*View.tsx`에서 고친다(옛 `StudioPage.tsx`에 화면 코드 없음).
- 플랜: [docs/PLAN_20261017_DESIGN_RENEWAL.md](docs/PLAN_20261017_DESIGN_RENEWAL.md) · 개선 원장: [docs/IMPROVEMENTS.md](docs/IMPROVEMENTS.md) · 인수인계: [docs/IMPROVEMENT_HANDOFF_20261017.md](docs/IMPROVEMENT_HANDOFF_20261017.md)

## 2026-10-17 v1.70 — 공용 이미지 기준 코드 갱신 반영 (Claude Code 윈도우)
- 기준 `gemini-image-client`(ai-image-studio)이 바뀌어 사본을 `--sync`로 다시 받음: ① 응답에서 **최종** 이미지를 고름 — gemini-3-pro-image가 함께 보내는 중간 초안(`thought: true`) 이미지를 결과로 잘못 쓰던 위험 제거 ② 사용량(usageMetadata) 함께 반환 ③ 선택적 요청 취소 신호(`signal`) 지원(쓰지 않으면 동작 같음). 이 프로그램 코드·프롬프트는 바꾸지 않음.
- 확장: manifest·ZIP·DB `extension_version`을 같은 버전으로 맞추고 `check-extension-release` 확인.
- 검수: tsc 0, Vercel 프로덕션 배포·DB 버전, 크롬 화면 버전 확인. 실제 이미지 생성 시험은 하지 않음(주인님 지시).

## 2026-10-17 v1.71 — 이미지 생성 시간 초과 안내 문구 통일 (Claude Code 윈도우)
- 공용 기준 `gemini-image-client`(ai-image-studio)의 시간 초과 안내를 「이미지 생성이 N초 안에 끝나지 않았습니다. 이미지가 이미 만들어졌을 수 있으니 잠시 뒤 결과를 확인한 다음 다시 시도해 주세요.」로 바꿔 사본을 `--sync`로 다시 받음. 시간 초과여도 구글 쪽에서는 이미지가 만들어져 회원 키에 요금이 나갔을 수 있어, 바로 다시 눌러 이중 과금되는 일을 줄이려는 목적이다. 프롬프트·모델·화질·시간 제한 값은 그대로.
- 확장 프로그램: manifest·다운로드 ZIP·DB `extension_version`을 같은 버전으로 맞추고 `check-extension-release` OK. 회원은 ZIP을 다시 받아 기존 폴더에 덮어쓴 뒤 `chrome://extensions`에서 새로고침해야 반영된다.
- 검수: 기준 테스트 8개 통과(문구 확인 추가), `check-shared-modules` 전부 OK, Vercel 프로덕션 배포·DB 버전, 크롬 화면 버전. 실제 이미지 생성 시험은 하지 않음(비용).

## 2026-10-18 v1.72 — 이미지 시간 초과 자동 재시도 중단(이중 과금 방지) (Claude Code 윈도우)
- 공용 기준 `gemini-image-client`(ai-image-studio)이 **시간 초과(TIMEOUT)는 자동으로 다시 보내지 않도록** 바뀌어 사본을 `--sync`로 다시 받음. 시간 초과여도 구글 쪽에서는 이미지가 만들어져 회원 키에 요금이 나갔을 수 있어, 자동 재시도가 이중 과금의 원인이 될 수 있었다. 서버 오류·혼잡(429)·연결 실패는 그대로 1회 재시도. 프롬프트·모델·화질·시간 제한 값·안내 문구는 그대로이고, 시간 초과 안내가 재시도 대기 없이 더 빨리 뜬다.
- 확장 프로그램: manifest·다운로드 ZIP·DB `extension_version`을 같은 버전으로 맞추고 `check-extension-release` OK(확장 코드 변경 없음, 버전만). 회원은 ZIP 다시 받기 → 덮어쓰기 → `chrome://extensions` 새로고침.
- 검수: 기준 테스트 8개 통과(시간 초과 1회 요청·연결 실패 2회 요청 확인), `check-shared-modules` 전부 OK, Vercel 프로덕션 배포·DB 버전, 크롬 화면 버전. 실제 이미지 생성 시험은 하지 않음(비용).

## 2026-10-18 v1.73 — 이미지 시간 초과 안내를 「Google 사용량 확인」으로 정정 (Claude Code 윈도우)
- 공용 기준 `gemini-image-client`(ai-image-studio)의 시간 초과 안내를 정정해 사본을 `--sync`로 다시 받음: 「…결과를 받지 못했습니다. 구글 쪽에서는 이미 생성되어 요금이 나갔을 수 있으니, 바로 다시 누르기 전에 Google AI Studio 사용량(https://aistudio.google.com/usage)을 확인해 주세요.」 이전 문구 「잠시 뒤 결과를 확인」은 틀린 안내였다 — 시간 초과는 우리 서버가 요청을 끊는 것이라 이미지가 프로그램(보관함 등)에 저장되지 않고, 회원이 확인할 수 있는 것은 본인 Google 사용량(요금)뿐이다.
- 확장 프로그램: manifest·다운로드 ZIP·DB `extension_version` 같은 버전, `check-extension-release` OK(확장 코드 변경 없음). 회원은 ZIP 다시 받기 → 덮어쓰기 → `chrome://extensions` 새로고침.
- 검수: 기준 테스트 8개 통과(사용량 주소 포함 확인), `check-shared-modules` 전부 OK, Vercel 프로덕션 배포·DB 버전, 크롬 화면 버전. 실제 이미지 생성 시험은 하지 않음(비용).

<!-- DETAILED_PROGRAM_REVIEW_20261019 -->
## 2026-10-19 Codex — 프로그램별 상세 개선 분석(구현 아님)

[세부 개선안·필요 이유·근거·시험 조건](docs/DETAILED_REVIEW_20261019.md) · [전체 83개 분석](../docs/program-reviews-20261019/INDEX.md) · [공통 아이디어 표](../docs/PROGRAM_IDEA_BACKLOG.md). 이 프로그램 3개 검토 항목입니다. 코드·DB·환경변수·배포는 바꾸지 않았습니다. 작업 전 최신 개선 원장·ACTIVE_WORK와 대조하고 이미 해결된 기능은 보존합니다. 후속 작업 후 처리 ID·증거·미완료·새 인사이트·프로그램 링크를 기록합니다.
<!-- /DETAILED_PROGRAM_REVIEW_20261019 -->

## 2026-10-20 v1.80 — 상대 비용 표시 + 새 모델 커밋 알림 (Claude Code 윈도우)
- 기준 코드에 `openAIModelCostLevel`(💰 빠름·💰💰 균형·💰💰💰 고품질)·`openAIModelBadge`(「⚡ 빠름 · 비용 💰」), 설명에 「상대 표시, 정확한 단가 아님」 + 테스트(8개). 화면 3곳 요약 줄을 배지로. 사본 8곳 동기화.
- `scripts/check-openai-models.mjs` `--staged`·`--new` + 커밋 직전 훅(`scripts/git-hooks/`, 경고만).
- 검수: tsc 0 · 테스트 46 통과(1 건너뜀) · build · 배포 `naver-blog-seo-studio-ahxlo439a` Ready · DB·확장 v1.80 OK · 크롬: mini 💰·4.1 💰💰·astra 💰💰💰, GPT-4.1로 되돌림(호출 없음).

## 2026-10-20 v1.79 — 모델 성격 설명 + 점검 스크립트 HANDOFF 자동 기록 (Claude Code 윈도우)
- 기준 코드에 `openAIModelTierHint(model)` + 테스트(7개). 제목 화면 2곳·설정 화면의 「모델 성격: … ⓘ」를 `<details class="model-tier">`로 — 마우스를 올리면 `title` 말풍선, 누르면 펼침(휴대폰 대응). 사본 8곳 동기화(쇼핑제휴 v1.70 배포, 7곳 미배포 그대로·각 tsc 0).
- `scripts/check-openai-models.mjs --live`: 결과를 `docs/HANDOFF.md` 맨 위에 한 줄 자동 기록(`--no-handoff`로 끔), 401 키 오류는 기록 없이 멈춤, 오류 문구 속 키 조각 가림(임시 저장소에서 가짜 키로 시험).
- 검수: tsc 0 · 테스트 45 통과(1 건너뜀) · build · 배포 `naver-blog-seo-studio-2fum2jgkn` Ready · DB·확장 v1.79 OK · 크롬(일반 회원 세션): astra 「💎 고품질 ⓘ」 말풍선·펼침 확인, 모델 GPT-4.1로 되돌림.
- 같은 날 일반 회원 계정 검수 완료(v1.78, 인수인계 문서).

## 2026-10-20 v1.78 — 모델 성격 표시 (Claude Code 윈도우)
- 기준 코드에 `openAIModelTier(model)`(⚡ 빠름: mini·nano·luna / 💎 고품질: sol·astra·pro·gpt-5·o1·o3 / ⚖️ 균형: 그 밖, OpenAI 글 모델이 아니면 빈 값) + 테스트. 제목 화면 2곳·설정 화면 모델 선택 칸 아래 「모델 성격: …」(`.model-tier`). 사본 8곳에도 복사(쇼핑제휴 v1.69 배포, 나머지 7곳 미배포 목록 그대로).
- 같은 날 `scripts/check-openai-models.mjs`(모델 목록 수집·보낼 옵션 표시, `--live`로 시험 안 한 모델만 1회 호출) 추가.
- 검수: tsc 0 · 테스트 44 통과(1 건너뜀) · build · 배포 `naver-blog-seo-studio-gi3hpdd52` Ready · DB·확장 v1.78 OK · 크롬: mini ⚡·4.1 ⚖️·sol 💎·luna ⚡ + 안내, GPT-4.1로 되돌림(호출 없음).

## 2026-10-20 v1.77 — 공용 기준 코드 `openai-request-params`의 기준 + GPT-5·GPT-6 응답 지연 안내 (Claude Code 윈도우)
- 기준 `lib/ai/openaiRequestParams.ts`(+ `tests/openaiRequestParams.test.mjs`, `npm run test:openai-params`): `openAIGenerationParams(model, { temperature, maxTokens })`(추론 모델은 온도 제외·`max_completion_tokens` 최소 4000), `isOpenAIReasoningModel`, `openAIModelNotice`, `openAIErrorReason`. v1.75의 `openaiModels.ts` `openAITemperature`·`openAIErrorReason`은 지우고 OpenAI 호출 6곳이 기준 코드를 씀(동작 같음). **이 파일을 고치면 사본(threads-affiliate-poster)도 함께 — 루트 `docs/SHARED_MODULES.md`·`SHARED_FEATURE_MAP.md` §8.**
- 화면: 제목 화면 본문 생성 모델(2곳)·설정 「OpenAI 콘텐츠 생성모델」에서 GPT-5·GPT-6 계열이면 `.model-notice` 안내.
- 검수: tsc 0 · 테스트 43 통과(1 건너뜀) · build · 배포 `naver-blog-seo-studio-2l39mi5xn` Ready · DB·확장 v1.77 OK · 크롬: v1.77, 안내 표시, `gpt-5.6-luna` 경험 질문 200·5개, 모델 선택 GPT-4.1로 되돌림.

## 2026-10-20 v1.76 — 대시보드 상태 안내 초기값 수정 (Claude Code 윈도우)
- 원장 #18: `useStudio.ts` `message` 초기값을 빈 문자열로, `StudioPage.tsx`는 안내가 있을 때만 `.workspace-notice` 표시. 기록이 있어도 「아직 생성된 블로그(원문)이 없습니다.」가 보이던 문제.
- 버전 v1.76(코드·manifest 1.76.0·ZIP·DB, `20261020160000_bump_version_v1_76.sql`, ref `esgxyikcnnvmlhygjkth`), `check-extension-release` OK. 검수: tsc 0 · 테스트 39 통과(1 건너뜀) · build · 배포 `naver-blog-seo-studio-lrsl9fczp` Ready · 크롬: v1.76, 목록 2건일 때 안내 상자 없음.
- 같은 날 다른 프로그램 GPT-5 계열 점검 결과는 루트 `docs/HANDOFF.md` 맨 위 항목 참고.

## 2026-10-20 v1.75 — GPT-5 계열 생성 400 수정·여러 단어 키워드 점검·휴대폰 목록 넘침 (Claude Code 윈도우)
- **원장 #14 수정**: GPT-5·GPT-6·o 계열은 OpenAI가 `temperature` 지정을 거부(400). `lib/ai/openaiModels.ts`에 `openAITemperature(model, t)`(이 계열이면 온도 제외)·`openAIErrorReason(response)`(OpenAI 거부 이유를 「— OpenAI 안내: …」로 덧붙임) 추가, OpenAI 호출 6곳(`generator.ts`·`contentJson.ts`·`contentVisuals.ts`·`drafts/analyze`·`drafts/optimize`·`titles/recommend`)에 적용. 새 OpenAI 호출을 만들 때도 이 두 함수를 쓴다.
- **원장 #16**: `lib/seoQuality.ts` 여러 단어 키워드는 단어가 모두 있으면 포함(「단어별로 포함됨」), 반복 횟수는 통째 횟수와 단어별 최소 횟수 중 큰 값.
- **원장 #15**: `.history-item > span`·`.history-list > *`에 `min-width:0` — 긴 제목이 날짜 칸을 밀어내 휴대폰 가로 스크롤이 생기던 문제.
- 버전: `lib/version.ts`·manifest 1.75.0/v1.75·ZIP 재생성(확장 코드 변경 없음, 회원 재설치 불필요), DB `version`/`extension_version` v1.75(ref `esgxyikcnnvmlhygjkth`, `20261020150000_bump_version_v1_75.sql`), `check-extension-release` OK.
- 검수: tsc 0 · 테스트 seo-quality 8(새 2개) · categories 2 · update-banner 3 · browser 26(1 건너뜀) · build · 배포 1회(`naver-blog-seo-studio-5070zzgwa` Ready). 크롬(관리자 세션): 사이드바 v1.75, `gpt-5.6-luna`로 경험 질문 API 호출 200·질문 5개(v1.74에서 400이던 같은 경로), 400px iframe 문서 폭 381=화면 폭·날짜 칸 안쪽. 비용: 관리자 본인 OpenAI 키 짧은 호출 1회.
- 새로 발견: 원장 #18(대시보드 상태 안내 초기값이 그대로 보임) — 미수정.

## 2026-10-20 v1.74 — 「SEO 최적화 도우미 6.5.4」 분석 기반 업그레이드 + 전략 거부 버그 수정 (Claude Code 윈도우)
- 주인님 결정: 외부 데스크톱 앱을 새 프로그램으로 만들지 않고 이 스튜디오에 흡수. 원본은 정적 분석만(실행 안 함), 코드·프롬프트는 옮기지 않음. 플랜 [docs/PLAN_20261020_SEO_HELPER_UPGRADE.md](docs/PLAN_20261020_SEO_HELPER_UPGRADE.md), 인수인계 [docs/IMPROVEMENT_HANDOFF_20261020.md](docs/IMPROVEMENT_HANDOFF_20261020.md).
- **버그 수정**: `app/api/drafts/generate/route.ts` 허용 목록이 옛 이름(「전환 스토리」「인사이트 가이드」)이라 화면에서 **「홈판 스토리」「인사이트 엣지」를 고르면 항상 400**이었다. 이제 `lib/ai/generator.ts`의 `SEO_STRATEGY_NAMES`(전략 안내 표의 키) 하나를 화면·API가 같이 쓴다. 회귀 테스트: `tests/seo-quality.test.mjs` 마지막 항목.
- **새 기능** (모두 저장하지 않고 생성 요청에만 사용, DB 변경 없음):
  - 제목 화면 「내 실제 경험」 메모(1,500자) + 「경험 떠올리기 질문 받기」(`POST /api/drafts/experience-questions`, 본인 키, 질문 5개만 — AI가 경험을 지어내지 않음). 메모는 사실로 본문에 녹이고 그 밖의 경험은 만들지 않도록 지시.
  - 「자연스러운 문체로 다듬기」(기본 꺼짐 — 기존 회원 결과가 예고 없이 바뀌지 않게), 「FAQ 넣기」(AEO는 항상 켜짐).
  - 결과 화면 「발행 전 점검」(`components/studio/QualityPanel.tsx` + 순수 함수 `lib/seoQuality.ts`): 제목 길이·키워드 포함/위치·첫 문단·키워드 반복·분량·긴 문단·[확인 필요]·상투 표현·FAQ·이미지, 많이 쓴 단어 상위 15개(조사·서술어·연결어 제외), 📱 모바일 미리보기. **네이버 공식 점수 아님**을 화면·매뉴얼에 명시.
- **분량 보강 개선**(실검수 중 발견): 저렴한 모델이 2,000자 기준을 못 넘으면 요금만 나가고 글을 못 받던 문제 → 보강을 최대 2회, 부족한 글자 수를 숫자로 지시, 더 짧아지면 이전 본문 유지, **1,500자 이상이면 저장하고 `seo_report.lengthNotice`(분량 안내)** 를 붙임(1,500자 미만만 실패).
- 확장: 코드 변경 없음, manifest 1.74.0/v1.74·ZIP 재생성, DB `version`/`extension_version` v1.74(ref `esgxyikcnnvmlhygjkth`, 마이그레이션 `20261020120000_bump_version_v1_74.sql`), `check-extension-release` OK. 회원 확장은 다시 받을 필요 없음(동작 같음).
- 검수: tsc 0 · eslint 새 경고 0 · 테스트 seo-quality 6 · categories 2 · update-banner 3 · browser 26(1 건너뜀) · build · 배포 4회(마지막 `naver-blog-seo-studio-aydgzlfis` Ready). 크롬(관리자 세션, 이미지 요청은 시험 탭에서 차단): 제목 추천 → 경험 질문 5개 → 메모 추가 → 홈판 스토리 생성 성공(공백 제외 2,052자, 메모 경험 반영) → 점검 5/10·단어 빈도·모바일 미리보기 확인, 400px iframe에서 점검표 1열 전환(창 최대화로 실제 창 폭은 못 줄임).
- **다음 CLI 주의**: ① GPT-5 계열(`gpt-5.6-luna`)은 생성 요청이 OpenAI 400으로 실패 — 온도(`temperature`) 지정을 받지 않는 것으로 추정, 이번에 미수정(개선 원장 #14). ② 저렴한 모델은 메모 경험을 조금 부풀릴 수 있음(「신나게 뛰어놀았다」) — 발행 전 직접 확인 안내 유지.
