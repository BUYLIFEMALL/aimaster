# 네이버 블로그 SEO 스튜디오 개발 지침

## 프로그램 버전 관리

- 현재 회원용 앱·확장 공개 버전은 `v1.61`이며 `lib/version.ts`의 `APP_VERSION`, 공용 DB `programs.version`, 확장 `manifest.json`의 `version_name`, 다운로드 ZIP을 항상 같은 값으로 변경한다.
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
- 네이버 최종 발행 버튼을 자동으로 누르지 않습니다.
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
- **네이버 발행 카테고리**: 웹에서 [카테고리 불러오기] → 확장이 새 탭에서 발행 설정창만 열어 실제 카테고리(번호·이름)를 읽고 닫는다 → 목록에서 선택 → `naver_blog_seo_drafts.naver_category`(`{id,name}`)에 저장. 기본값은 마지막으로 쓴 카테고리(브라우저 localStorage `naver_blog_seo_naver_category_last_v1`)를 새 글에 자동 선택. 확장은 입력 뒤 발행 설정에서 **번호+이름이 정확히 같을 때만** 그 카테고리를 선택하고(`naver-category-page.js`의 `categorySelect`, ai-auto-blog가 실제 화면에서 확인한 셀렉터 `categoryItemText_<번호>`), 웹에서 고른 값이 없으면 기존 방식(사이드패널 '카테고리명' 입력)을 그대로 쓴다. 최종 발행은 누르지 않는다.
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
