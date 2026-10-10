# 🤖 네이버 블로그 에이전트 (naver-blog-agent) — CLI 인수인계 & 작업 가이드 (CONTINUATION.md)

> **최종 갱신**: 2026-10-10 | **현재 버전**: `v1.62` | **라이브 URL**: https://naver-blog-agent.vercel.app
> Claude Code, Codex, Gemini 등 **어떤 AI 에이전트가 이어서 작업하더라도 즉시 파악하고 안전하게 작업할 수 있도록 정리한 기술 인수인계 문서**입니다.

---

> **먼저 읽기**: Claude Code 인수 분석(확장이 로컬 브리지 프로토콜이라 웹 큐와 연결 안 됨 등 새로 확인한 사실, 남은 작업 체크리스트)은 [`NEXT_STEPS_2026-10-08.md`](./NEXT_STEPS_2026-10-08.md)에 있습니다.

## 2026-10-08 최종 인수인계 요약 — 다음 CLI는 이 절부터 읽습니다

## 2026-10-10 v1.62 — 카테고리 조회와 상태 확인 충돌 보완

- 실제 웹→확장 검사에서 발행 작업 없이 주기적인 상태 확인만 진행 중이어도 카테고리 조회를 거절하는 문제를 발견했습니다. 상태 확인이 끝날 때까지 최대 10초 기다리고 잠금을 잡아 조회합니다. 실제 activeTask가 있으면 즉시 차단합니다. 동시 조회도 같은 잠금으로 순서대로 처리합니다.
- 보관함 발행 설정은 긴 본문 앞 모달 최상단으로 올렸습니다. v1.61 카테고리·태그 기능은 아래에 기록했습니다.

## 2026-10-10 v1.61 — 네이버 발행 카테고리·태그

- 생성 결과 및 보관함의 「발행 설정」에서 실제 네이버 카테고리를 불러오고 원고별 카테고리·태그를 저장합니다. 블로그 기본 카테고리 저장도 선택할 수 있습니다. 원고별 설정이 기본값보다 우선하며 글감 분류와 별개입니다.
- 기존 `research_summary.naver_publishing`(블로그 ID·카테고리 ID/이름), `tags`, `nba_accounts.default_category`를 사용합니다. DB 스키마 변경 없이 제목·본문·이미지를 보존합니다. 설정 API는 회원 권한·원고 소유자 검사, 대기/발행 중 변경 및 동시 대기 전환 차단을 적용합니다.
- 웹→확장 조회는 운영 도메인의 content script만 허용하며 서버가 확인한 확장 연결 회원·블로그가 원고 소유자와 일치해야 합니다. 토큰은 웹으로 전달하지 않습니다. 카테고리 삭제/개명/중복 이름은 자동 대체하지 않고 중지합니다.
- 태그는 #·공백 제거 및 중복 정리 후 최대 10개입니다. 네이버 기존 태그를 보존하고 실제 등록된 칩을 검증합니다. 같은 설정을 다시 적용해도 중복되지 않습니다. 저장 전 변경/입력 중인 태그가 있으면 발행 전송을 막습니다.
- **실제 네이버 검수 통과:** 본인 계정의 별도 새 글에서 32/32 단계, 이미지 4장·고유 파일명 4개, 원고 전체 검증 통과. 실제 카테고리 13개 조회, `●AI자동화`(ID 29) 선택, 원고 태그 10개 등록 및 재적용 후 10개 유지, 본문 보존 확인. 최종 발행하지 않았습니다.
- 자동 검사: `npm run test:extension`, `npm run test:publishing`, `npm run test:edit-save`. 배포 후 실제 웹 설정 저장·재조회와 라이브 ZIP을 별도 확인합니다. 확장 ZIP 재다운로드→덮어쓰기→`chrome://extensions` 새로고침 후 프로그램 웹 페이지도 새로고침해야 새 연결 스크립트가 적용됩니다.

### v1.60 추가 (실제 네이버 편집기 검수 완료)

- 주인님 Chrome 화면 제어 복구 → 본인 계정의 별도 새 글에서 실제 원고 입력 검수. v1.59에서 카메라 이모지만 남고 설명이 사라지는 네이버 입력 문제를 재현했습니다. `editor.js`는 복합 이모지를 보존한 채 일반 텍스트와 별도 입력하고 전체 원문을 검증합니다. `prepareFreshNaver()`는 늦게 뜨는 이어쓰기 창을 처리한 뒤 2초간 빈 편집기를 확인합니다.
- **실제 검수 통과:** v1.60 `writeArticle()` 32/32, 이미지 4장·고유 파일명 4개·중복 0, 인용구 5개, 본문 마지막 문장 확인, `imageAi`·전체 `verify` 통과, `published:false`. 네이버 새 검수 탭에 원고를 남겼습니다. 최종 발행은 하지 않았습니다.
- 빌드·확장/편집 저장 검사·JS 문법 검사 통과. 이모지 뒤 텍스트 손실·복합 이모지 보존·늦은 이어쓰기 팝업 회귀 검사를 추가했습니다. 사용자 데이터는 변경하지 않았습니다.
- 코드 `a134f3ab`·origin/master 푸시·프로덕션 배포 READY 완료(`dpl_3X9pYRbJMcjcP8AdCnttUhTmS2zf`, https://naver-blog-agent.vercel.app). 운영 DB/확장/라이브 ZIP v1.60 일치, 확장 릴리스 검사 실패 0·경고 0, ZIP HTTP 200 및 background/editor/writer/manifest SHA256 로컬 일치, 공개 버전 API 200/v1.60. 버전 SQL `20261010054000_nba_bump_version_v1_60.sql` 적용. 기존 보관함 본문·이미지 4장·상태 보존. PC 확장 최종 코드로 새로고침, 검수 완료 네이버 원고 탭 표시.

### v1.59 추가 (확장 이미지 중복·입력 중단)

- 코드 `34c023ab`·푸시·프로덕션 READY 배포(`dpl_8Pw7dBMuQk4ojPxsXbHA1GdDBr9z`) 완료. 빌드·확장/편집 저장 검수 통과, 변경 파일 린트 오류 0/경고 5. 실제 실패 원고 변환은 고유 이미지 4장·본문 3장 모두 포함. DB/확장/라이브 ZIP v1.59 일치(실패 0/경고 0), 라이브 ZIP 핵심 파일 해시 일치, 기존 원고 본문/이미지/상태 보존 확인. 당시 PC 화면 제어 오류로 실제 검수를 보류했으나, 화면 복구 후 v1.60에서 실제 입력·검증까지 통과했습니다(위 항목).
- 원인/수정/검수는 `AGENTS.md` v1.59 항목. 기존 실패 원고 본문은 보존하고 전송 변환 시 대표 중복·본문 이미지 한 칸 밀림을 복구합니다. 새 스마트 편집은 본문 이미지만 매핑합니다. 업로드/검증 파일명 일치·URL 중복 방어·이미지 업로드 자동 재시도 금지. `writeArticle()`은 입력·검증만 하며 `publish()`가 이후 최종 발행을 수행합니다. 실제 검수에서 최종 발행하지 않습니다.

### v1.58 추가 (결과 작업 버튼 정렬·저장 버튼 강조)

- 코드 커밋 `f0a28a61`·origin/master 푸시·프로덕션 배포 완료(`dpl_DRp7F8eSpP2XTLR1XUUopdUNS8tr`, READY). 빌드 통과·변경 화면 ESLint 오류 0/경고 25. 실제 로그인 Chrome에서 저장된 원고를 열어 오른쪽 정렬·파란 저장 버튼·흰 글자를 확인했습니다. 운영 DB/확장/라이브 ZIP v1.58 일치(검증 실패 0/경고 0). 배포 시 `--scope buylife`를 명시합니다.
- `src/app/(dashboard)/page.tsx` 결과 카드: 상태 정보와 작업 버튼을 두 줄로 분리, 버튼 줄 `justify-end`+줄바꿈. 「보관함 저장」 파란 배경·흰 글자·초점 표시.
- 자동 저장 후속 과제: 개별 이미지 추가/제거는 현재 서버 저장을 호출하지 않고, 자동 저장 배지도 성공 결과 없이 표시됩니다. 초기 임시 ID가 서버 UUID로 바뀌는 사이 이미지 저장에서 다른 임시 ID를 사용할 수 있어 중복 원고가 생깁니다. 이번 UI 변경은 이 로직을 수정하지 않습니다. 확인된 원고는 수동 저장 후 4개 이미지 URL이 서버에 반영됐습니다.

### v1.50 기록 (확장 새 버전 알림)

- 서버: `src/app/api/extension/version/route.ts`(공개, 버전·다운로드 주소만). 확장: `background.js`의 `isNewer`/`checkUpdate`(시작·설치·알람 `update-check` 6시간·팝업 열 때 `checkUpdate` 메시지), 결과는 `chrome.storage.local.update`, 아이콘 배지 `NEW`. 팝업: `connect.html #update`, `connect.js showUpdate`. 다른 확장 프로그램에 이식할 때는 이 세 부분(버전 경로·확장 비교·팝업 배너)을 그대로 복사한다. (정정 2026-10-09: `ai-auto-blog`는 자체 배너가 이미 있고 `naver-blog-seo-studio`는 v1.60에 whoami 방식으로 추가함. 현황표: 루트 `docs/EXTENSION_RELEASE_RULES.md`)

### v1.49 추가 (회원별 DB 이관 + 핵심 테이블 생성)

- 테이블: `nba_accounts(user_id, blog_id UNIQUE per user, label)`, `nba_content_categories(user_id, id text, name, slug, sort_order, PK(user_id,id))`, `nba_posts`, `nba_extension_tokens` — 전부 RLS owner-only(`supabase/migrations/0049_nba_core_tables.sql`, 프로덕션 적용 완료). `nba_categories`(0001의 계정별 프리셋)는 쓰이지 않아 만들지 않았습니다.
- 동기화: `src/lib/serverSync.ts`(pull/push/merge), `src/hooks/useAccountsSync.ts`(계정), `src/hooks/useContentCategories.ts`(분류). 처음 연결한 브라우저는 로컬+서버 합치기 후 `nba_server_sync_done_*` 표시, 이후 서버 우선.
- 이전까지 `/api/posts`는 `nba_posts`가 없어 `naver_blog_seo_drafts`로 폴백했고, 확장 연결용 테이블이 없어 v1.43 흐름은 DB 단계에서 막혀 있었습니다. 이제 열렸지만 실제 Chrome 설치·발행 시험은 여전히 미실시입니다.

### v1.48 추가 (ESLint, CRON_SECRET 점검)

- `eslint.config.mjs`(경고 기반 기준선). `CRON_SECRET` 미설정 확인(`vercel env ls`): `/api/cron/cleanup`은 비밀값이 없으면 항상 401(안전하게 닫힘)이지만 `vercel.json`의 크론이 매일 401만 받습니다. 또한 라우트가 `?key=` 쿼리로도 비밀값을 받으므로 URL이 로그에 남을 수 있습니다(헤더 인증만 남기는 것을 권장, 미변경).

### v1.47 추가 (연도 정책)

- `src/lib/yearPolicy.ts`: `sanitizeYear`(짧은 문구, 과거→올해 전부), `sanitizeBodyYear`(본문, 범위·"지난"·과거형 단서가 있으면 보존, 기준·현재·신청 등 최신 단서면 올해). `pipeline.ts`는 제목/목차/태그는 전자, 초안·윤문·최종 본문은 후자. 한계는 AGENTS.md v1.47 참고.

### v1.46 추가 (Reviewer 보강)

- `pipeline.ts` 4단계: 본문 전체 전달, 글자수 코드 측정(`[SECTION]`/`[IMAGE INSERT]` 줄 제외, 85~115%), 파싱 실패=`UNKNOWN`, `reviewStatus`는 `PipelineResult`에 선택 필드(저장글 로드 시 없음). 화면은 stepsLog의 warn으로 표시. 자동 재생성은 미구현(필요 시 후속).

### v1.45 추가 (Writer 입력 보강 + 페르소나 주제 혼합 해소)

- `pipeline.ts` `writerUserPrompt`에 주제·키워드·발행 목적 추가. `page.tsx handleGenerateWithPersona`는 `overrideTopic: p.defaultTopic`(낡은 `topic` 상태 미사용). 카테고리는 기존대로 사용자가 고른 콘텐츠 분류 우선.

### v1.44 추가 (모델 매핑 정직화)

- `src/lib/ai/models.ts`: `resolveModel(provider, model)`이 선택 ID를 그대로 반환, 비었을 때만 `DEFAULT_MODELS`. 옛 모델로 치환하던 코드 삭제. `test:models`가 `contentModels.ts` 목록 전체를 모의 SDK로 검증.
- **결정(주인님, 2026-10-09)**: 연도는 글을 생성하는 시점의 올해(`new Date().getFullYear()`) 기준. 최신 정보 연도만 올해로, 역사적 날짜는 보존(5번 작업에서 구현).

### v1.43 추가 (확장 ↔ 웹 큐 연결, 이 절이 아래 "남은 검토 과제 2번"을 대체)

- **구조**: 확장 `extension/background.js`의 `api(route, body)`가 어댑터입니다. `/pair`→`POST /api/extension/auth`, `/poll`→`/task`(연결한 블로그 ID의 `queued` 글 1건을 `publishing`으로 선점), `/result`→`/finish`, `/task/status`·`/status`·`/disconnect`→`/status`. `/progress`·`/stage`·`/waiting`·`/heartbeat`는 서버 호출 없는 no-op입니다. 폴링 주기는 10초입니다(알람 30초 보조).
- **변환** `src/lib/extensionBridge.ts`: `[IMAGE INSERT - 설명]`을 실제 본문 이미지 순서대로 `[IMAGE INSERT - N]`으로 재번호하고 연결할 이미지가 없는 자리는 삭제(확장 검증과 일치). 스마트 에디터 HTML 원고는 줄 단위로 변환(h1~h3→`[SECTION]`). 썸네일은 제목 이미지. 이미지는 `payload.assets[].url`을 확장이 직접 내려받아 base64로 변환(`*.supabase.co` 권한). **`category_name`은 콘텐츠 분류이므로 네이버 카테고리 선택에 전달하지 않습니다.** 공개 설정은 `public`, 예약은 `is_reserved && scheduled_at`일 때만.
- **연결 UI**: 확장 팝업에 네이버 블로그 ID 입력 추가(영문·숫자·`_`·`-` 2~40자). 웹 원고의 `blog_id`와 같아야 가져갑니다.
- **알려진 한계**: 실제 Chrome 설치·페어링·네이버 발행은 검수하지 않았습니다(승인 필요). `publishing`에서 멈춘 글의 자동 복구, 웹 쪽 진행 상황 표시는 없습니다. 확장이 쓰던 `heartbeat`로 웹에 연결 상태를 표시하지 않습니다(`last_ping_at`은 폴링마다 갱신).
- **검수**: `npm run test:extension`(변환·선점·권한·결과·어댑터 모의), 기존 4개 테스트, `npm run build` 통과. 다음 배포는 v1.44.

### 현재 상태와 작업 범위

- 이번 기능 수정은 v1.29~v1.42입니다. 최신 기능 커밋은 `0db81a1d`(페르소나 조건 버튼), 직전은 `4d636a4c`(카테고리 설명 제거)이며 둘 다 `origin/master`에 푸시하고 프로덕션 배포했습니다.
- v1.42 기능 배포는 `dpl_598FvMXEF5DYGDDJbZAg7FD2jram`, 주소는 `https://naver-blog-agent-mtg89vr9s-buylife.vercel.app`, 운영 주소는 https://naver-blog-agent.vercel.app 입니다. 배포 READY, Next.js 16.2.11, 서버 빌드 17초를 확인했습니다.
- 이번 마감 작업은 문서만 보강하고 같은 v1.42를 재배포합니다. 기능/소스/패키지/DB/확장 버전을 새 기능 없이 올리지 않습니다. 다음 **코드 변경 배포**는 v1.43부터 시작합니다.
- 다른 CLI가 작업한 Threads 폴더·루트 임시 파일·`supabase/.temp/cli-latest`는 보존합니다. 작업 트리 전체가 깨끗하지 않아도 이 프로그램 변경분만 확인하고 정확한 경로를 커밋합니다.

### 구현 순서와 최종 확정 사항

| 순서 | 버전/기능 커밋 | 최종 반영 사항 |
|---|---|---|
| 1 | v1.29 `4af368cd`, v1.30 `b9b62e1b` | API·확장 이용 권한 검증, 사이드바 보조 메뉴/로그인 정보를 작업 메뉴 바로 아래 배치 |
| 2 | v1.31 `9b0f7bf5` | 네이버 계정 등록·수정을 `/settings`로 이동 |
| 3 | v1.32 `b05cf8f5`, v1.33 `e02011a8` | 회원별 글·이미지 모델 저장/복원, 생성 시작 버튼 아래 독립 흰색 설정 박스 |
| 4 | v1.34 `f8522ad0` | 페르소나와 독립된 말끝 4종·문체 8종, 파이프라인 공통 지침/검증 |
| 5 | v1.35 `e88f6abe` → v1.36 `d05cbd12` | 처음 계정별 네이버 메뉴로 잘못 연결했던 카테고리를 사용자 콘텐츠 분류로 정정. v1.35 방식으로 되돌리지 않음 |
| 6 | v1.37 `849c084b` | 생성 화면에서도 같은 공통 창으로 카테고리 등록·수정·삭제·순서 관리 |
| 7 | v1.38 `a02299fe` → v1.39 `af495bd8` | 기획 폼 행 배치 최종 확정: 블로그 ID/카테고리, 주제/목적, 키워드 전체 너비 |
| 8 | v1.40 `b46a1685` | 계정·카테고리 메뉴 폐기, `/accounts`는 `/settings` 리다이렉트, 계정 관리 컴포넌트 분리·기존 데이터 보존 |
| 9 | v1.41 `4d636a4c` | 카테고리 설명 두 줄과 여백·잔존 접근성 참조 제거 |
| 10 | v1.42 `0db81a1d` | 조건 불러오기 파란색 실제 버튼 → 선택됨 초록색. 이전 항목은 파란색 복귀 |

### 핵심 연결과 반드시 유지할 동작

- **기획 화면**: `src/app/(dashboard)/page.tsx`. 위 표의 최종 배치를 유지합니다. 모든 서브프로그램은 흰색 베이스이며 메인 플랫폼의 검정 배경을 복사하지 않습니다.
- **공통 분류**: `src/lib/contentCategories.ts` + `src/hooks/useContentCategories.ts` + `CategoryManagementModal.tsx`. 저장 키는 `nba_collector_categories`, 생성/수집소/보관함/편집기가 같은 목록을 읽습니다. 같은 창 이벤트·다른 탭 storage·focus 갱신이 있으며 다른 기기와 회원별 서버 동기화는 아닙니다.
- **분류 선택**: 분류명만 변경합니다. 키워드·목적·말끝·문체를 덮어쓰지 않습니다. 현재 선택 이름 변경은 ID를 따라가고 삭제 시 현재 선택만 해제합니다. 목록 변경으로 기존 글감·원고 본문을 지우거나 기존 기록의 분류를 일괄 변경하지 않습니다. 명시적인 빈 목록을 기본 목록으로 되살리지 않습니다.
- **계정 연결**: `/settings`의 `src/components/NaverAccountManager.tsx`. `nba_accounts_local`의 기존 계정 객체와 옛 categories/default_category/추가 필드를 보존합니다. 더 이상 `/accounts/page.tsx`를 컴포넌트처럼 import하지 않습니다.
- **모델 설정**: `/api/generation-preferences` + `nba_generation_preferences`(회원별). 글 엔진·세부 모델, 이미지 플랫폼·모델·비율·장수만 저장합니다. 저장 버튼은 생성/발행을 실행하지 않습니다. 말끝·문체·페르소나·카테고리까지 영구 저장된다고 설명하지 않습니다. 로딩 완료 전 생성/모델 변경 잠금을 유지합니다.
- **문체**: `src/lib/ai/writingStyles.ts`. 말끝/문체 선택은 페르소나 어조보다 우선합니다. Writer/Humanizer/Reviewer에 전달하되 사실·조건·숫자·인용 보존 및 허구 경험/후기 금지를 유지합니다.
- **페르소나 버튼**: `activePersonaId === p.id`로 단일 선택을 표시합니다. `handleSelectPersona`가 주제·키워드·목적을 적용하며 분류/문체는 유지합니다. 버튼의 `type="button"`·`stopPropagation()`·`aria-pressed`·포커스 표시를 유지합니다. `페르소나 불러오기`는 무료 로컬 조건 적용이며 `즉시 생성`과 구분합니다.
- **저장·보관**: 원고는 `/api/posts` 서버 저장을 사용하고 로컬 저장은 임시 버퍼입니다. 자동 저장과 영구 무제한 보관은 다릅니다. 원고/이미지/수집 글감에는 30일 정리 정책이 있고 보관 표시된 중요 글감은 삭제 대상에서 제외합니다.
- **권한/키**: AIMaster 공용 권한과 회원 본인 API 키를 사용합니다. API는 JSON 401/403, 페이지는 기존 접근 게이트, 확장은 토큰 소유자의 현재 프로그램 권한을 재검증합니다. 관리자 키 폴백·개별 회원가입/별도 DB를 만들지 않습니다.

### 확인 완료와 검수 한계를 구분합니다

- v1.42에서 `test:personas`, `test:categories`, `test:writing-styles`, `test:navigation`, `npm run build`가 모두 통과했습니다. 실제 JSX/핸들러 모의 검수이며 유료 AI 응답 품질/실제 최종 발행 성공 검수가 아닙니다.
- 로그인된 운영 브라우저 v1.42의 실제 화면에서 파란색 버튼·선택 초록색을 확인했습니다. 자취생 조건 버튼 클릭 후 이전 주부 버튼 파란색 복귀·새 버튼 초록색·주제/목적 변경을 확인하고 원래 주부 선택으로 복구했습니다. 실제 AI 생성/회원 데이터 삭제/네이버 발행은 하지 않았습니다.
- 로그인 없는 HTTP 요청의 `/` 응답 307은 로그인 안내로 정상입니다. 확장 v1.42 ZIP은 HTTP 200입니다. 배포 직후 해당 배포의 1시간 error 로그 조회는 `No logs found`였습니다. 장기 모니터링·외부 로그 전송(Drains) 설정은 확인하지 않았습니다.
- `npm run lint`는 기존 ESLint 설정 파일 부재로 실행 불가 이력이 있습니다. 빌드/테스트 성공을 린트 성공으로 보고하지 않습니다.

### 남은 검토 과제 — 이번 문서 마감에서 수정하지 않았습니다

1. **선택 모델과 실제 호출 모델 일치(우선)**: `src/lib/ai/models.ts`에서 gpt-4.1/gpt-5*/gpt-6*를 gpt-4o로, gemini-3*를 gemini-2.0-flash로, Claude를 opus/haiku/sonnet 구형 ID로 치환합니다. 저장/복원 UI 정상과 선택 모델 실제 사용은 별개입니다. 공급자 공식 지원 모델·회원 키 접근 가능 여부 확인 후 명시적인 오류/폴백 정책과 모의 요청 테스트를 설계해야 합니다. 실제 유료 호출은 이번에 하지 않았습니다.
2. **확장과 웹 큐 연결(우선)**: 배포 확장 `extension/background.js`의 API는 `http://127.0.0.1:46321` 로컬 브리지입니다. 웹 `/api/extension/*` 경로 존재·ZIP 다운로드 성공만으로 브라우저 단독 페어링/발행 완료를 보장하지 않습니다. 실제 설치·페어링·웹 큐 전달을 별도 검수해야 합니다.
3. **글 입력 전체 반영**: 페르소나 즉시 생성의 `overrideTopic: topic.trim() || p.defaultTopic`은 이전 주제와 새 화자를 섞을 수 있습니다. `pipeline.ts`의 Writer 사용자 프롬프트는 원본 키워드/목적을 직접 넣지 않고 기획 결과를 사용합니다. 자동 조건/사용자 수정 우선순위를 먼저 확정하고 단계별 전달을 검수해야 합니다.
4. **품질 판정**: Reviewer는 `humanizedArticle.slice(0, 1500)`만 검수하고 파싱 실패의 기본값에 PASS가 있습니다. 목표 글자수 준수/전체 본문 검수/실패 판정은 별도 보완 대상입니다. 테스트 통과를 전체 원고 품질 보장으로 설명하지 않습니다.
5. **데이터 격리/동기화**: 계정·공통 분류는 기존 브라우저 저장입니다. 회원별 DB 이관/다른 기기 동기화는 DB 스키마 변경 승인과 기존 데이터 이관 계획이 필요합니다. 임의 초기화로 해결하지 않습니다.
6. **이전 정책 검토**: 과거 연도를 당해 연도로 일괄 치환하는 기존 방어막은 실제 과거 사실과 충돌할 수 있습니다. 최신 정보 확보와 역사적 날짜 보존을 분리하는 개선은 사용자 정책 확인 후 별도 작업합니다.

### 다음 CLI의 실행 순서

1. 루트 `PROGRESS.md` → `docs/HANDOFF.md` → `docs/ERROR_LESSONS.md` → 이 문서/프로젝트 `AGENTS.md`를 읽습니다. 다른 CLI 담당 폴더를 건드리지 않습니다.
2. `git status`·`git log --oneline -10`·`git fetch origin master`·`git rev-list --left-right --count origin/master...HEAD`로 최신 클론/브랜치를 확인합니다. 사용자 변경을 reset/checkout으로 덮어쓰지 않습니다.
3. 다음 요청 범위의 코드만 수정하고 아래 검수를 실행합니다(프로젝트 폴더 안).

```powershell
npm run test:personas
npm run test:categories
npm run test:writing-styles
npm run test:navigation
npm run build
```

4. 코드 변경 시 버전 +0.01, 프로젝트 문서·루트 HANDOFF·에러 교훈을 같은 커밋에 반영합니다. 정확한 경로만 `git add`한 직후 커밋·`git push origin master`·`vercel deploy --prod --yes --scope buylife`를 진행합니다.
5. READY·운영 주소·버전·인증 리다이렉트·ZIP·error 로그를 확인합니다. 로그인 화면은 사용자 로그인 세션으로 검수하며 캡처/쿠키/API 키를 Git에 넣지 않습니다. 완료 보고에는 작업 결과와 프로그램 링크를 항상 함께 제공합니다.
6. 파괴적 삭제/force-push·비밀번호/API 키 변경·환경변수/DB 스키마 변경·유료 API 대량 호출·회원 대신 최종 발행/결제/외부 공개는 별도 승인 대상입니다.

---

## 📌 0. 작업 시작 전 필수 점검 사항 (Checklist)

1. **로컬 Git 상태 및 동기화 확인**:
   ```bash
   git status
   git log --oneline -5
   ```
   - 다른 CLI(Codex 등)가 동시에 작업 중인 파일(예: `threads-content-ops/` 등)이 작업 트리에 있을 수 있으므로, **`git add -A`나 `git commit -a`를 절대 사용하지 말고 `naver-blog-agent/` 및 관련 문서만 명시적으로 스테이징**할 것!
2. **배포 시 Vercel 스코프 필수**:
   - `naver-blog-agent` 배포 시 반드시:
     ```bash
     cd naver-blog-agent
     vercel deploy --prod --yes --scope buylife
     ```
3. **버전 관리 불변칙 (Rule 5)**:
   - 프로그램을 수정해 배포할 때마다 마이너 버전 +0.01 (`v1.28 ➔ v1.29`).
   - 변경 대상 5곳:
     1) `src/lib/version.ts`: `APP_VERSION = "v1.29"`
     2) `package.json`: `"version": "1.29.0"`
     3) `extension/manifest.json`: `"version": "1.29.0"`
     4) Supabase DB `programs.version` (slug: `naver-blog-agent` ➔ REST PATCH)
     5) 마이그레이션 SQL: `supabase/migrations/00XX_bump_version_v1_XX.sql`
   - `npm run build` 시 `prebuild` 스크립트(`scripts/build-extension-archive.mjs`)가 실행되어 자동으로 최신 크롬 확장 ZIP 번들(`public/downloads/naver-blog-agent-extension-vX.XX.zip` 및 `latest.zip`)을 패키징함.
4. **2026년 당해 연도 기준 3중 방어막 (Rule 9)**:
   - LLM 사전학습 컷오프로 인해 2023, 2024년으로 퇴행하는 오류를 원천 차단하기 위해 **입력단 정제 + 프롬프트 당해 연도 절대 제약 + 출력단 정규식 교정** 유지.

---

## 🏗️ 1. 전체 시스템 아키텍처 및 핵심 파일 구조

```
naver-blog-agent/
├── extension/                     # 🌐 크롬 브라우저 확장 프로그램 (Manifest V3)
│   ├── manifest.json             # 확장 메타데이터 및 권한 설정 (v1.42.0)
│   ├── background.js             # 백그라운드 서비스 워커 (대기열 주기적 폴링 & 탭 오픈)
│   ├── content.js                # 스마트에디터 ONE 내부 DOM 조작 & 사람 타자 모사 (30~120ms 딜레이)
│   ├── popup.html / popup.js     # 확장 팝업 UI (8자리 페어링 코드 입력 & 연결 상태 점검)
│   └── icons/                    # 확장 아이콘 (16, 48, 128)
├── public/
│   └── downloads/                # 크롬 확장 다운로드용 자동 생성 ZIP 번들
├── scripts/
│   └── build-extension-archive.mjs # 빌드 시 확장 폴더를 최신 버전 ZIP으로 압축하는 스크립트
├── src/
│   ├── app/                      # Next.js 16 App Router
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx        # force-dynamic, requireProgramAccess() 세션 검증
│   │   │   ├── page.tsx          # ✍️ 2단계: 5단계 AI 글 생성 & 멀티 이미지 스튜디오
│   │   │   ├── collector/        # 🔥 1단계: 떡상 글감 수집소 (트렌드/뉴스/URL 분석)
│   │   │   ├── queue/            # 📑 3단계: 생성 원고 보관함 & 스마트 에디터 & 발행 큐
│   │   │   ├── accounts/         # 옛 주소 호환: /settings로 리다이렉트만
│   │   │   ├── dashboard/        # 📊 최상단 운영 대시보드 (통계 & 3개 빠른 작업 카드)
│   │   │   ├── settings/         # 🔑 API키등록·플랫폼연동 (BYOK 키 & 페어링 코드)
│   │   │   └── guide/            # 📖 연동 & 실전 사용 매뉴얼 (최신 개정판)
│   │   └── api/
│   │       ├── collector/        # 글감 수집, 카테고리, 보관함 책갈피 API
│   │       ├── posts/            # Supabase DB 원고 저장 (30일 정책, GET/POST/PUT/DELETE)
│   │       ├── generate/         # 5단계 AI 글 생성 파이프라인
│   │       ├── generate-image/   # 4대 AI 이미지 생성 플랫폼 연동
│   │       ├── generation-preferences/ # 회원별 기본 글·이미지 모델 저장/복원
│   │       ├── upload-image/     # Supabase Storage 이미지 업로드
│   │       ├── keys/             # 페어링 코드 발급 및 검증
│   │       ├── extension/        # 크롬 확장 통신 (auth, task, finish)
│   │       └── cron/cleanup/     # 30일 만료 콘텐츠 자동 삭제 Cron (Vercel Cron 연동)
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx       # 1~3 번호형 Stepper & 하단 구분선 분리 표준 사이드바
│   │   │   └── Header.tsx        # 모바일 헤더
│   │   ├── collector/
│   │   │   └── CategoryManagementModal.tsx # 카테고리 관리 모달
│   │   ├── NaverAccountManager.tsx # /settings의 블로그 ID 등록·수정, 기존 데이터 보존
│   │   ├── BlogSmartEditorModal.tsx # Tiptap 기반 듀얼(위지윅/코드) 스마트 에디터
│   │   └── ContentRetentionNotice.tsx # 30일 보관 및 자동 삭제 공지 배너
│   └── lib/
│       ├── access.ts             # AIMaster 통합 권한 체크 (requireProgramAccess)
│       ├── retention.ts          # 30일 만료일 및 잔여일수(D-xx) 계산 유틸리티
│       └── version.ts            # 프로그램 버전 (APP_VERSION = "v1.42")
```

---

## 💡 2. 최근 주요 작업 내역 (v1.20 ~ v1.42)

| 버전 | 작업 일자 | 핵심 구현 내용 |
|---|---|---|
| **v1.42** | 2026-10-08 | **페르소나 조건 버튼**: 미선택 파란색·선택 초록색, 실제 버튼/키보드 포커스/aria-pressed. 조건만 적용·폼 제출 및 카드 중복 호출 방지. `test:personas` 6개 항목 모의 검수 |
| **v1.41** | 2026-10-08 | **카테고리 아래 설명/여백 제거**: 공유 분류 안내·현재 기획 카테고리 문구와 도움말 블록 제거, `aria-describedby` 잔존 참조 제거. 선택·관리·입력값·기존 행 배치 유지. 문구 부재 회귀 검사 |
| **v1.40** | 2026-10-08 | **불필요한 계정·카테고리 페이지/메뉴 제거**: 작업 흐름 1~3, 대시보드 3개 카드. `/accounts`는 설정 리다이렉트만. 계정 관리 컴포넌트 분리·설정/생성 링크/매뉴얼 갱신. 기존 계정·옛 분류·공유 분류 데이터 보존. `test:navigation` 모의 검수 추가 |
| **v1.39** | 2026-10-08 | **기획 폼 2열 재배치**: 첫 행 블로그 ID/카테고리 선택·관리, 두 번째 행 특정 주제/발행 목적·독자 타깃, 아래 전체 너비 키워드. 동일 높이·좁은 화면 세로 전환. 기존 값/핸들러 유지 및 JSX 행·순서·높이 검수 |
| **v1.38** | 2026-10-08 | **기획 폼 정렬**: 카테고리 선택 상자+관리 버튼 동일 입력 행(40px), 특정 주제는 아래 전체 너비, 검색 키워드·발행 목적/독자 타깃은 다음 행 2열. 모바일 세로 전환 및 라벨 연결. 기존 입력/관리/생성 로직 보존, JSX 구조 테스트 추가 |
| **v1.37** | 2026-10-08 | **생성 화면 직접 카테고리 관리**: 수집소와 동일한 버튼·공통 모달로 등록/수정/삭제/정렬. 세 화면 공유 목록, 선택 항목 수정 시 ID 기준 이름 갱신·삭제 시 선택 해제. 저장 실패 완료 처리 방지·순서 변경 불변성·모달 폼 중첩 방지. 기존 원고 본문 보존 및 모달 실제 핸들러 모의 검수 |
| **v1.36** | 2026-10-08 | **카테고리 출처 정정**: `카테고리 선택`은 보관함·수집소의 사용자 콘텐츠 분류(`nba_collector_categories`). 세 화면 공통 훅·탭 동기화·생성 결과 편집기 연결. 계정/페르소나 전환·즉시 생성에서도 분류 유지. 기존 사용자 목록·순서 보존. v1.35의 계정별 목록 연결은 잘못된 해석으로 폐기 |
| **v1.35** | 2026-10-08 | **등록 카테고리 선택 상자**: 생성 폼에서 계정별 등록 목록을 선택하면 키워드·발행 목적을 함께 적용. 빈 계정 전환 시 이전 값 제거, 주제·말끝·문체 유지. 기존 `/accounts` 브라우저 저장 데이터를 재사용하며 DB 스키마 변경 없음. `npm run test:categories`로 실제 선택·제출 핸들러 모의 검수 |
| **v1.34** | 2026-10-08 | **말끝·문체 확장**: 4종 말끝×8종 문체, 독립 흰색 박스·표현 예시·생성 결과 배지. `writingStyles.ts` 공통 레지스트리와 서버 검증, Writer/Humanizer/Reviewer 우선 지침. 페르소나·계정·카테고리 변경 및 즉시 생성에서도 선택 유지. `npm run test:writing-styles`로 32조합 모의 검수. 기존 모델 저장 스키마 변경 없음 |
| **v1.33** | 2026-10-08 | **모델 설정 독립 박스**: 생성 버튼 아래 별도 `section`으로 배치. 공통 저장 버튼은 글·이미지 설정을 함께 저장하며 저장 후 변경을 구분. 기본값 로딩 중 생성·선택 대기 및 로딩 오류 안내 추가. 기존 `/api/generation-preferences`·RLS 테이블 재사용 |
| **v1.32** | 2026-10-08 | **회원별 기본 생성 모델 저장**: 글 생성 엔진·세부 모델과 이미지 플랫폼·모델·비율·장수를 `nba_generation_preferences`에 저장하고, `/api/generation-preferences`가 권한과 모델 레지스트리를 검증한 뒤 다음 접속에 자동 복원 |
| **v1.31** | 2026-10-08 | **계정·카테고리 관리 분리**: 네이버 블로그 계정 연결·추가·수정·삭제는 `/settings`으로 이동, `/accounts`는 대상 계정 선택 드롭다운을 포함한 카테고리·키워드 관리 전용으로 정리 |
| **v1.30** | 2026-10-08 | **사이드바 연결 메뉴 위치 조정**: `justify-between` 하단 고정을 없애고 API키등록·매뉴얼·로그인 계정·로그아웃을 4번 계정·카테고리 관리 바로 아래에 배치 |
| **v1.29** | 2026-10-08 | **API·확장 이용 권한 검증**: 웹 API는 `checkProgramAccessApi()`로 JSON 401/403을 반환하고, 확장 토큰은 페어링·작업 수신·결과 반영 전 `evaluateProgramAccessForUser()`로 소유자의 현재 이용 권한을 재검증 |
| **v1.28** | 2026-10-08 | **좌측 사이드바 표준 Stepper 및 API키등록 분리**: 최상단 대시보드 ➔ 1~4 원형 번호 배지 및 세로선(떡상 콘텐츠 수집 ➔ 콘텐츠 생성 ➔ 콘텐츠 보관함 ➔ 계정 운영정보) ➔ 구분선(`border-t`) 아래 `🔑 API키등록·플랫폼연동`, 매뉴얼, 계정, 로그아웃 분리 배치 |
| **v1.27** | 2026-10-08 | **연동 & 실전 사용 매뉴얼(`/guide`) 전면 개편**: Akamai 보안 우회 원리, 3분 연동, 실전 4단계 워크플로우, 30일 보관 정책, FAQ 6종 집대성 |
| **v1.26** | 2026-10-08 | **사이드바 및 대시보드 메뉴 순서 정렬**: 계정·카테고리 메뉴를 원고 보관함 밑으로 배치하여 작업 흐름 동기화 |
| **v1.25** | 2026-10-08 | **30일 보관 및 자동 삭제(Content Retention)**: `retention.ts`, `ContentRetentionNotice.tsx`, D-xx 배지, Vercel Cron(`/api/cron/cleanup`), 보관함 책갈피(초록색) 영구 보호 |
| **v1.24** | 2026-10-08 | **원고 보관함 카테고리 연계**: 글감 수집소 카테고리 체계 공유, 탭 필터링, 인라인 변경, 다중 선택 일괄 이동(Bulk Move) |
| **v1.23** | 2026-10-08 | **대시보드 퀵 액션 카드 순서 개편**: 1번 글감 수집 ➔ 2번 글 생성 ➔ 3번 보관함 ➔ 4번 계정 관리 |
| **v1.22** | 2026-10-08 | **사이드바 대시보드 최상단 배치**: 플랫폼 표준 준수 |
| **v1.21** | 2026-10-08 | **서버 Supabase DB 원고 영구 저장 API (`/api/posts`)**: 로컬스토리지 의존 탈피, Dual Storage Adapter (`nba_posts` / `naver_blog_seo_drafts`), RLS owner-only 격리 |
| **v1.20** | 2026-10-08 | **원고 보관함 & 발행 큐(`/queue`) 전면 개편**: Tiptap 듀얼 스마트 에디터, PC 사진 첨부, AI 이미지 추가 생성 |

---

## ⚠️ 3. 다음 작업 시 반드시 주의할 핵심 사항 (Gotchas)

0-5. **v1.42 페르소나 조건 버튼**:
   - `페르소나 불러오기`와 `✓ 선택됨`은 같은 실제 버튼의 상태입니다(v1.57에서 "조건 불러오기"에서 이름 변경). `activePersonaId === p.id` 기준으로 파란색/초록색을 전환합니다. 기본 선택 페르소나도 초록색이며 페르소나 불러오기는 AI 생성/발행을 실행하지 않습니다.
   - `type="button"`·`stopPropagation()`·`aria-pressed`·포커스 표시·생성 중 잠금을 유지합니다. 기존 카드 선택 및 즉시 생성 핸들러는 변경하지 않습니다. `npm run test:personas`와 기존 테스트/빌드를 실행합니다.

0-4. **v1.41 카테고리 설명 제거**:
   - `generation-category-help` 문구/블록은 주인님 요청으로 제거했습니다. 선택 상자는 로딩/빈 목록 상태를 직접 안내하고 라벨 연결은 유지합니다. 삭제된 도움말의 `aria-describedby`를 복원하지 않습니다.
   - 이 변경은 화면 설명과 여백만 제거하며 실제 현재 기획 카테고리 값이나 공유 목록, 입력 키워드/목적, 선택/관리 핸들러를 초기화하지 않습니다. `test:categories`가 구조와 문구 부재/기능 보존을 함께 검수합니다.

0-3. **v1.40 폐기 페이지와 계정 컴포넌트 분리**:
   - `/accounts`는 `/settings`로 리다이렉트만 합니다. 이 라우트를 client 컴포넌트로 import하거나 옛 메뉴/계정별 카테고리 UI를 복원하지 않습니다.
   - 설정은 `components/NaverAccountManager.tsx`를 사용합니다. 기존 저장 키와 account 객체의 categories/default_category/기타 필드를 보존하며 일괄 삭제/이관은 하지 않습니다. 기존 샘플 초기화 동작은 유지합니다.
   - 생성/대시보드 계정 링크는 `/settings`, 사용자 분류 관리는 기존 공통 모달입니다. 사이드바 1~3 및 빠른 작업 카드 3개입니다.
   - `npm run test:navigation`, `test:categories`, `test:writing-styles`, `npm run build`로 검수합니다. 실제 회원 데이터 쓰기·유료 생성·발행은 실행하지 않습니다.

0-2. **v1.39 입력 폼 배치 (v1.38 후속 사용자 지정)**:
   - `generation-account-category-row`의 왼쪽은 `generation-blog-id`, 오른쪽은 카테고리 선택·관리 묶음입니다. 카테고리 내부는 `xl:flex-row` 이전에는 세로 배치해 좁은 열 넘침을 막습니다. 관리 버튼은 `type="button"`이고 공통 모달을 엽니다.
   - `generation-topic-purpose-row`의 왼쪽은 `generation-topic`, 오른쪽은 `generation-purpose`입니다. `generation-keywords`는 그 아래 전체 너비 행입니다. 두 행은 `grid-cols-1 md:grid-cols-2`, 입력 높이는 모두 `h-10`입니다. 값·기존 제출 핸들러는 변경하지 않습니다.
   - `test:categories`가 실제 JSX 부모·표시 순서·동일 높이·반응형 분기를 검증합니다. 카테고리·문체 테스트와 빌드 통과입니다.

0-1. **v1.37 생성 화면의 공통 카테고리 관리 모달**:
   - `page.tsx`의 `handleUpdateRegisteredCategories`는 `useContentCategories.saveCategories` 성공 후 현재 선택을 ID로 추적합니다. 모달은 생성 폼 밖에 렌더링하며 관리 버튼은 `type="button"`입니다. 등록/수정만으로 AI 생성이나 발행을 실행하지 않습니다.
   - `CategoryManagementModal`의 저장 콜백은 `boolean | void`로 기존 호출자와 호환됩니다. 실패(`false`) 시 입력 및 기존 목록을 유지하고 안내합니다. 순서 변경 시 각 항목을 복사한 뒤 수정합니다.
   - 분류 목록 변경은 기존 글감·원고 본문을 삭제하지 않습니다. 생성 화면은 기존 기록의 분류명을 자동 일괄 재작성하지 않으며, 삭제된/이름이 바뀐 분류의 기존 기록은 각 보관함의 카테고리 이동 기능으로 재분류합니다.
   - 로컬 검수: `test:categories`(공통 모달 실제 CRUD/정렬 핸들러, 중복/취소/마지막 항목/저장 실패, 3개 화면 이벤트 갱신, 선택 추적, 기존 원고 보호, 폼 중첩 검사), `test:writing-styles`, `npm run build` 통과. 브라우저 저장·다른 기기 동기화 한계는 아래 v1.36 기록과 같습니다.

0. **v1.36 카테고리 선택의 데이터 출처와 검수 한계 (v1.35 정정)**:
   - 생성 폼·보관함·수집소·생성 결과 편집기는 사용자 콘텐츠 분류 `nba_collector_categories`를 공유합니다. `/accounts`의 `nba_accounts_local`은 네이버 계정별 메뉴/기획 설정이며 이 목록의 출처가 아닙니다. 공통 훅과 저장 유틸을 사용하며 별도 복사본을 만들지 않습니다.
   - 분류 선택은 분류명만 바꿉니다. 계정 전환·페르소나 전환·즉시 생성에서도 선택 분류를 유지합니다. 주제·키워드·발행 목적·말끝·문체를 분류 선택으로 덮어쓰지 않습니다. 기존 글감 선택은 해당 글감 분류를 불러옵니다.
   - 동일 창 custom event, 다른 탭 storage event, 창 focus에서 목록을 갱신합니다. 저장 목록·순서를 그대로 사용하고 명시적인 빈 목록은 유지합니다. 브라우저 저장 방식을 서버/회원별/다른 기기 동기화로 설명하지 않습니다.
   - `npm run test:categories`와 `npm run test:writing-styles` 후 빌드합니다. 실제 글 생성 품질/네이버 최종 발행 성공을 이 선택 UI 테스트로 보장하지 않습니다.
   - v1.36 로컬 검수: 두 테스트와 `npm run build` 통과. 카테고리 테스트는 실제 저장 유틸·훅·이벤트·선택 핸들러·폼/즉시 생성·로컬 원고 저장 및 `/api/posts` 요청을 모의 실행합니다. `npm run lint`는 기존 `eslint.config.*` 부재로 실행 불가(기존 ERROR_LESSONS의 v1.29 기록 참고). 린트 성공으로 보고하지 않습니다.
   - 이전 진단에서 확인된 별도 후속 과제(이번 요청 범위 밖): 계정·카테고리의 회원별 서버 저장 이관, 페르소나 즉시 생성의 기존 주제 혼합, Writer에 원본 키워드·발행 목적 직접 전달, 글자수·Reviewer 전체 본문 검증, 배포 확장의 로컬 브리지 의존과 웹 큐 연결 검증. 확대 구현/DB 스키마 변경은 별도 범위·승인 확인 후 진행합니다.

1. **원고 저장 및 조회는 반드시 `/api/posts` 서버 API를 경유할 것**:
   - 브라우저 `localStorage`는 오프라인 임시 버퍼일 뿐이며, SSOT는 항상 Supabase DB입니다.
   - `Dual Storage Adapter`가 구현되어 있어 `nba_posts` 테이블이 없더라도 `naver_blog_seo_drafts`에 안전하게 폴백 저장됩니다.
2. **30일 자동 삭제 대상에서 보관된 글감(is_archived = true) 제외 보장**:
   - 글감 수집소에서 초록색 책갈피를 누른 글감은 회원이 아껴둔 핵심 자산이므로, 배치 정리(`cron/cleanup`) 시 절대 삭제되지 않도록 `is_archived IS NOT TRUE` 필터가 유지되어야 합니다.
3. **네이버 스마트에디터 ONE DOM 변경 감지 주의**:
   - 크롬 확장의 `content.js`는 스마트에디터 ONE의 내부 iframe 셀렉터(`.se-title-text`, `.se-component-content` 등)를 기반으로 작동합니다. 네이버 에디터 업데이트 시 셀렉터 폴백 로직을 확인해야 합니다.
4. **흰색 베이스 UI 원칙 준수 (Rule 8)**:
   - 본문, 카드, 모달, 입력창은 항상 흰색 또는 옅은 중성색(`bg-white`, `border-neutral-200`, `bg-neutral-50`)을 기본으로 유지합니다.
5. **API route에서는 `requireProgramAccess()`를 호출하지 말 것**:
   - 이 함수는 페이지 이동을 위한 `redirect()`를 사용합니다. API는 `checkProgramAccessApi()`로 JSON 오류를 반환해야 합니다.
   - 확장처럼 웹 세션이 없는 요청은 토큰에서 `user_id`를 확인한 뒤 `evaluateProgramAccessForUser(userId)`를 사용합니다.
