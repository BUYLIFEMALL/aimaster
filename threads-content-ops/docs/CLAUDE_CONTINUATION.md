# Claude 작업 재개 안내 — Threads 콘텐츠 운영 자동화

> 기준일: 2026-10-09 · 현재 버전: `v1.88` · 라이브: <https://www.buylife.xyz/threads-content-ops>

## v1.88 최신 변경 — 보관함 수정·지금 발행·포스팅완료

`DraftComposer`에 수정→본문 편집→저장·수정 취소, 지금 발행 진행 상태, 완료된 글·발행 시각·게시글 보기, 상태 필터·포스팅완료 집계를 추가했습니다. `page.tsx`는 publishing/published도 보관함에 전달하며 전체 상태별 DB 건수(조회 실패는 숫자 대신 —)를 집계합니다. 목록 최근 300건, 메인 대시보드 이력 최근 30건. `web-actions.ts`의 `runDraftAction`은 안전한 결과 객체, `saveDraft`는 실제 갱신 확인, `publishDraft`는 조건부 상태 변경으로 중복 발행을 방지합니다. 외부 게시 뒤 DB 기록 실패는 failed로 되돌리지 않습니다. 모의 검수 16개: `node --test threads-content-ops/tests/draft-actions.test.cjs`. 실제 회원 계정 외부 게시 시험은 수행하지 않았습니다. DB 스키마 변경 없음. 상세는 `AGENTS.md` v1.88을 읽으세요.

## v1.87 최신 변경 — 미분류 기본 카테고리

글감 수집·보관함의 미분류 칩은 0건이어도 항상 표시됩니다. 공통 카테고리 관리 창에도 삭제·이름 변경할 수 없는 기본 미분류 항목과 건수를 추가했습니다. 미선택 콘텐츠는 기존 `category_id = null` 저장 규칙을 그대로 쓰므로 이전 콘텐츠도 자동으로 포함됩니다. 같은 이름의 직접 추가·이름 변경은 서버에서 차단합니다. DB 스키마 변경 없음. 버전 갱신은 `scripts/sync-program-version.mjs`로 코드에서 읽어 해당 slug만 갱신·재조회합니다. 자세한 검수 결과는 `AGENTS.md` v1.87 절을 확인하세요.

## ★ 최신 작업 요약 (v1.70 ~ v1.86, 2026-10-08) — 이 절을 먼저 읽으세요

아래 "완료된 구현 순서"는 v1.34 무렵까지의 기록이라 오래됐습니다. **현재(v1.82) 상태는 이 절이 기준**입니다. 자세한 구현 이유는 `AGENTS.md`의 같은 버전 절을 보세요.

### 버전별 변경

| 버전 | 내용 | 핵심 위치 |
|---|---|---|
| v1.70 | 콘텐츠 생성 결과 카드의 "이미지 생성" 버튼을 파란색으로, 생성 중 자리 표시 타일, 카드별 이미지 표시 | `AttentionComposer.tsx` |
| v1.71 | 저장되면 초록 "✓ 저장됨" 버튼, 카드별 "📎 직접 추가"(내 이미지·영상 업로드) | `AttentionComposer.tsx`(`uploadOwn`) |
| v1.72 | 공통 미디어 섹션(MediaManager) 제거 — 이미지는 카드별로만 | `AttentionComposer.tsx` |
| v1.73 | `?tab=manage` 이름을 **콘텐츠 보관함**으로, "AI 초안 만들기" 카드 삭제 | `DraftComposer.tsx`, `ContentOpsSidebar.tsx` |
| v1.74 | 보관함 본문 칸이 스크롤 없이 세로로 자동 확장 | `DraftComposer.tsx` |
| v1.75 | 보관함 글에 카테고리 — **글감 수집과 같은 카테고리를 공유**(`tco_posts.category_id`, 글감의 카테고리를 상속) | `DraftComposer.tsx`, `web-actions.ts`(`moveDrafts`, `saveGeneratedDraft`) |
| v1.76 | 글감(보관 중 제외)·보관함 글(검토 대기·발행 실패) **만든 지 30일 후 자동 삭제** + 안내 박스·남은 일수 배지 | `lib/retention.ts`, `lib/contentCleanup.ts`, `RetentionNotice.tsx`, `app/api/threads-content-ops/cleanup-media/route.ts` |
| v1.77 | 계정 관리의 **운영정보(주제·말투·성격·대상 독자·금지 주제·금지 표현)를 글 생성·다시 쓰기 프롬프트에 반영** | `lib/attention.ts`(`OperationRules`, `operationBlock`), `web-actions.ts`(`loadOperationRules`) |
| v1.78 | **페르소나를 고르지 않으면 운영정보 전체, 페르소나를 고르면 그 페르소나로 생성(운영정보는 금지 주제·금지 표현만 유지)**. 다시 쓰기는 원문 말투 유지 + 금지 사항만 | `lib/attention.ts`(`operationBlock(rules, forbiddenOnly)`) |
| v1.79 | 쇼핑제휴 상품 등록에 **알리익스프레스** 추가(주소 → 제휴 링크 자동 생성 + 썸네일 + "이미지 다시 가져오기") | `lib/aliexpress.ts`, `web-actions.ts`(`registerAliexpressSource`, `refreshAliexpressSourceImage`) |
| v1.80 | 쇼핑제휴 상품 등록에 **토스쇼핑 쉐어링크** 추가(베스트·카테고리별·오늘의 특가 목록에서 골라 저장 시 쉐어링크 발급) | `lib/toss.ts`, `web-actions.ts`(`browseTossForSources`, `fetchTossCategoriesForSources`, `registerTossSource`) |
| v1.81 | 상품 등록 화면을 **플랫폼 탭**(쿠팡파트너스·알리익스프레스·네이버 브랜드커넥트·토스쇼핑 쉐어링크)으로 개편. poster의 오른쪽 "상품·상세페이지 분석" 탭은 하지 않음(주인님 지시) | `SourceQueue.tsx` |
| v1.86 | 사이드바 `?tab=accounts` 메뉴 이름을 "계정 운영정보" → **"계정 콘셉트 설정"**으로 변경(기능·주소 그대로) | `ContentOpsSidebar.tsx`, `AccountOperations.tsx`, `AttentionComposer.tsx` |
| v1.85 | 콘텐츠 생성 결과 카드에 **게시방식 결정 및 최종 발행** 박스(임시저장 기본·즉시 Threads 포스팅·예약 발행, poster `/posts/new` STEP 3 구성). 예약은 v1.84 크론(`CRON_SECRET`)이 켜져야 실제 발행 | `AttentionComposer.tsx`(`VariantCard`), `web-actions.ts`(`publishSavedDraft`, `scheduleSavedDraft`) |
| v1.84 | **예약 발행 실행기** — 회원이 예약해 둔 글을 시각이 되면 1분 간격 크론이 본인 Threads 계정으로 발행(중복 발행 방지·권한·토큰·미디어 재검증). 새 글 자동 생성·댓글 확인은 만들지 않음 | `lib/scheduledDispatch.ts`, `app/api/threads-content-ops/dispatch-scheduled/route.ts`, `vercel.json` |
| v1.83 | 모든 AI 지시문에 당해 연도 규칙(`withYearRule`) | `lib/yearRule.ts` |
| v1.82 | 토스용 `FIXIE_URL`을 루트 Vercel 프로젝트에 등록(주인님이 직접), 값 앞 공백 대비 trim | `lib/toss.ts` |

### 지금 동작하는 구조 (알아야 할 사실)

- **콘텐츠 생성**: 글감 선택 → 페르소나(선택) → AI 엔진(GPT/Claude/Gemini) → 결과 카드(대표 글 + 훅 변형 5개). 글 생성에 쓰는 **운영정보 규칙은 v1.78 표를 따릅니다**(페르소나 선택 시 금지 사항만). 저장은 계정별 보관함(`tco_posts`)으로 갑니다.
- **상품 연결 글**: `lib/productPost.ts`의 `PRODUCT_SOURCE_TYPES`(coupang·naver_brand_connect·aliexpress·toss)만 콘텐츠 생성에서 연결됩니다. 종류별 제휴 고지 문구(`DISCLOSURE`)는 `threads-affiliate-poster/src/lib/ai/affiliateGenerator.ts`와 같게 유지합니다 — **고지 문구를 지우거나 조건부로 만들지 마세요**(표시광고법).
- **키는 모두 회원 본인 것**이며 poster와 **같은 `user_api_keys` 테이블**을 읽습니다. 그래서 poster에서 등록한 알리·토스 키가 이 프로그램에서 그대로 보입니다. 새 키 종류를 쓰려면 ① `user_api_keys.provider` check 제약에 값이 있는지, ② 루트 `lib/apiKeys.ts`의 `ApiKeyProvider` 타입, ③ `web-actions.ts`의 `CREDENTIAL_PROVIDERS`·`saveMemberCredentials`, ④ `WebSetup.tsx`(타입·`PROVIDER_FIELD`·입력 행)를 모두 맞춥니다.
- **소스 종류 추가 시**: `tco_content_sources.source_type` check 제약(`tco_content_sources_source_type_check`)을 마이그레이션으로 바꿔야 합니다(현재 허용: daily, youtube, blog, coupang, naver_brand_connect, aliexpress, toss). DB 변경은 주인님 사전 승인 사항입니다.
- **토스쇼핑**은 호출 서버 IP가 고정이어야 해서 `FIXIE_URL`(Fixie 프록시, 허용 IP 52.87.82.133·52.5.155.132) 환경변수가 **루트 AIMaster Vercel 프로젝트**에 있어야 합니다(없으면 화면에 안내 문구). poster와 같은 프록시·월 요청 한도(Tricycle 500건)·토스 쉐어링크 발급 한도(하루 1만 건)를 함께 씁니다. 주인님이 "잘 동작된다"고 확인했습니다(v1.82).
- **상품 화면 레이아웃**: `?tab=sources`는 플랫폼 탭으로 영역이 바뀝니다. 알리익스프레스는 "새 소스 등록"의 직접 입력 종류에 넣지 않고 전용 영역에서만 저장합니다(제휴 링크 자동 생성을 거치게 하려고).

### 남은 일 (요청이 있을 때만 시작)

1. ~~글 생성 지시문에 당해 연도 규칙 없음~~ — **완료(v1.83, 2026-10-08).** `lib/yearRule.ts`의 `withYearRule()`을 모든 AI 지시문에 적용했습니다. 새 AI 호출을 추가할 때도 감싸세요.
2. **새 글 자동 생성·게시와 댓글 확인은 없음** — 예약한 글의 시각 발행은 v1.84에서 구현됐지만(`lib/scheduledDispatch.ts`), 계정 관리의 자동화 스위치·일상/홍보 비율·하루 게시 목표·운영 시간은 **저장만** 되고 새 글을 만들어 올리지 않습니다. 댓글 확인은 `threads_read_replies` 권한이 연결 스코프에 없어 보류(회원별 opt-in 재연결 설계 필요). 화면에서 "새 글을 자동으로 올린다"고 표현하지 마세요.
3. ~~`CRON_SECRET` 미설정~~ — **완료(2026-10-08).** 루트 Vercel(Production)에 임의 값으로 등록(Sensitive)하고 재배포했습니다. 예약 발행 크론(`dispatch-scheduled`)과 일일 정리 크론(`cleanup-media`)이 이제 인증을 통과해야 동작합니다(암호 없이 호출하면 401). 값은 읽을 수 없으니 바꿀 때는 새로 `vercel env add`로 다시 등록하고 재배포하세요. 30일 자동 삭제 첫 실행은 2026-11-07 이후.
4. **실키 검증 대기** — **예약 발행은 실제 Threads로 검증 완료(2026-10-08, 시험 글이 예약 시각 약 30초 뒤 `buylife.co.kr`에 발행됨).** 아직 남은 것: 결과 카드의 "게시방식 결정" 박스(임시저장·즉시·예약)를 로그인 화면에서 눌러 보는 확인, Claude·NanoBanana·GPT Image·Replicate 이미지 생성, Threads 캐러셀 게시, **알리익스프레스 실등록(제휴 링크·이미지)**. 1GB 영상 업로드는 Supabase 파일 크기 한도에 달려 있습니다.
5. 예약 발행 데스크톱 워커는 `media`를 읽지 않습니다.
6. poster에서 아직 이식하지 않은 것: "상품·상세페이지 분석으로 등록" 탭(이미지·설명 분석), 쿠팡 "API 키 없을 때 직접 등록" 안내 박스(HTML 붙여넣기), 상품 목록의 미리보기 버튼. threads-easy-planner 쪽 기능도 미이식.
7. **기존 타입 오류(내 변경 아님)**: `threads-content-ops/lib/coupang.ts(135,36) TS2339 Property 'trim' does not exist on type 'never'` (v1.69, 다른 CLI). 빌드는 통과하며 `ignoreBuildErrors` 때문에 보이지 않습니다. 이 오류와 무관한 작업이면 건드리지 말고 보고에 적습니다.

### 이 대화에서 확립된 작업 방식

- 사용자(주인님)는 요청을 연달아 보냅니다. **요청 하나를 한 작업 단위로** 끝내세요: 빌드 → 경로 지정 커밋 → 푸시 → 배포 → `programs.version` 올리기 → 문서 → 한국어 존댓말(-습니다체) 보고. 보고 끝에 bkit 사용 현황 박스를 붙입니다.
- 커밋은 항상 `git commit -m ... -- <경로들>`로 하세요(여러 CLI가 같은 작업 폴더·스테이징을 씁니다). 이 문서를 쓰는 시점에 `naver-blog-agent`의 다른 CLI 작업이 올라가지 않은 채 남아 있습니다.
- 배포: 깨끗한 임시 작업 폴더에서 합니다 — `git worktree add --detach D:/Antigravity/_aimaster_deploy_tmp HEAD` → `.vercel` 복사 → `vercel deploy --prod --yes --scope buylife`(`Aliased https://www.buylife.xyz`, `readyState: READY` 확인) → `git worktree remove --force`(잠금이 걸리면 8초 뒤 재시도). 버전은 `lib/version.ts`·`README.md`·`AGENTS.md`·이 문서·DB `programs.version`을 함께 올리고 `supabase/migrations/<시각>_tco_bump_version_vX_YY.sql`을 남깁니다.
- 패치 스크립트에서 here-doc/sed로 백틱·`$`가 든 코드를 다루면 깨집니다. Edit 도구나 파일로 저장한 `.mjs`를 쓰세요.
- 에이전트는 **비밀번호·접속 주소(키가 든 값)를 명령에 직접 넣을 수 없습니다**(보안 검사가 차단). 환경변수 등록은 주인님이 `! cd /d/Antigravity/AIMaster && vercel env add <이름> production --value "<값>" --yes --sensitive --scope buylife`로 직접 하게 안내하세요(`!` 셸은 bash라 경로는 `/d/...`, 비대화형이라 `--value` 필수).
- DB 스키마·환경변수 변경, 삭제는 사전 승인(AskUserQuestion)을 받습니다.

## 먼저 읽을 문서와 확인 순서

1. 저장소 루트의 `AGENTS.md`, `PROGRESS.md`, `docs/HANDOFF.md`, `docs/ERROR_LESSONS.md`를 읽습니다.
2. 이 폴더의 `AGENTS.md`, `README.md`, 그리고 이 문서를 읽습니다.
3. `git status --short`, `git log --oneline -10`으로 다른 CLI의 동시 작업과 최신 커밋을 확인합니다.
4. 코드 수정 전 `docs/SIDEBAR_LAYOUT_STANDARD.md`, `docs/PLATFORM_PATTERNS.md`의 공통 레이아웃·권한 규칙을 확인합니다.

## 이 프로그램의 목적과 범위

이 프로그램은 설치형 원본 `desktop/`을 배포하는 것이 아닙니다. AIMaster 안에서 각 회원이 자신의 Threads 계정, 자신의 Meta Developers Threads 앱, 자신의 API 키를 연결해 사용하는 **웹 기반 콘텐츠 운영 도구**입니다.

- `desktop/`은 사용자가 제공한 `boksajang/threads-auto` 원본의 기능·흐름 참고 사본입니다. 수정하거나 배포하지 않습니다.
- 기존 `threads/`, `threads-comment-reply/`, `threads-affiliate-poster/`, `threads-easy-planner/`는 참고만 합니다. 다른 CLI가 작업 중인 폴더를 수정하지 않습니다.
- 원본 영상의 다크 화면은 기능 구조만 참고합니다. AIMaster의 실제 서브프로그램 작업 화면은 항상 **흰색 베이스**입니다. 다크 테마를 복제하지 않습니다.

## 완료된 구현 순서

### 1. 웹 전환과 기본 안전장치 (v1.17~v1.25)

- 회원별 Threads OAuth 연결, 회원별 OpenAI·YouTube·쿠팡·Meta 앱 자격증명 저장, 복수 Threads 계정 연결을 구현했습니다.
- 초안 생성, 초안·예약·재검토 상태 전환, YouTube 공개 제목·설명 소재 불러오기를 구현했습니다.
- Meta OAuth 콜백 URI는 `https://www.buylife.xyz/api/threads-content-ops/callback` 하나만 사용합니다.
- 모든 쓰기 Server Action은 로그인만이 아니라 프로그램 접근 권한 및 선택 계정의 `user_id` 소유를 재검사합니다.

### 2. 실제 데이터만 쓰는 웹 운영 대시보드 (v1.26)

- `/threads-content-ops` 기본 화면을 대시보드로 재구성했습니다.
- `tco_threads_accounts`, `tco_posts`, 본인 `user_api_keys`의 실제 데이터만 집계합니다.
- 원본 화면의 구조를 다음처럼 웹형으로 옮겼습니다: 운영 계정 → 즉시 작업 소스 → 상태 지표 → API 상태 → 실제 작업 이력 → 예약 목록.
- 쿠팡·네이버·블로그 소스, 댓글, 성과 데이터는 아직 실제 수집이 없으므로 가짜 숫자나 예시 상품으로 채우지 않습니다.

### 3. 계정별 운영정보와 소스 큐 데이터 기반 (v1.27)

- `?tab=accounts`에 세 번째 번호형 흐름 **계정 운영정보**를 추가했습니다.
- 각 회원은 연결한 각 Threads 계정별로 주제·성격·말투·대상 독자·금지 주제/표현·일상/홍보 비율·하루 목표·댓글 확인 주기·운영 시간을 저장합니다.
- 운영 DB에 아래 테이블을 적용하고, 각 테이블의 RLS 활성화와 4개(select/insert/update/delete) owner-only 정책을 검증했습니다.

| 테이블 | 역할 | 중요한 제약 |
| --- | --- | --- |
| `tco_operation_profiles` | 계정별 운영 선호값 | `user_id`, `account_id`, 계정별 1개 프로필 |
| `tco_content_sources` | 블로그·쿠팡·네이버 브랜드 커넥트 자료 큐 | 회원과 계정별 분리 |

- 마이그레이션: `supabase/migrations/20261006022901_tco_operation_profiles_and_sources.sql`
- `automation_enabled`는 발행 실행 권한이 아니라 선호 설정입니다. 워커·큐·재시도·최종 발행 권한이 구현되기 전에는 어떤 게시도 자동 실행되지 않습니다.

### 4. 콘텐츠 소스 큐 UI와 등록 (v1.28)

- 사이드바 번호 흐름에 **4. 콘텐츠 소스**(`?tab=sources`, `SourceQueue.tsx`)를 추가했습니다. 회원이 계정별로 블로그·쿠팡 파트너스·네이버 브랜드 커넥트 링크를 직접 등록·수정·삭제하고 상태(사용 가능/사용 완료/보관)를 바꿉니다.
- 외부 수집은 하지 않습니다. 서버 동작은 `web-actions.ts`의 `createContentSource`/`updateContentSource`/`setContentSourceStatus`/`deleteContentSource`이며, 모두 권한 검사 뒤 `user_id`로 제한하고 `{ ok, error }` 결과를 반환합니다(throw 금지 — 운영 서버가 메시지를 가림).
- 대시보드 "즉시 작업" 카드는 실제 등록 건수만 보여줍니다. 소스로 초안을 만드는 연결(아래 4번)이 구현되기 전에는 `작업 가능`으로 표시하지 않습니다.

> **v1.34 떡상 콘텐츠 수집(글감 수집):** 사이드바 1번에 새 메뉴 `떡상 콘텐츠 수집`(`?tab=viral`, `ViralCollector.tsx`, 수집기 `threads-content-ops/lib/collector.ts`)이 생겼고 아래 구현 순서에는 없는 주인님 추가 요청입니다. `threads/`(쓰레드 자동화)의 글감 수집(주소 지정·Perplexity)을 옮겼고 NewsBlur는 제외했습니다. 외부 주소를 읽는 코드이므로 SSRF 방어(`assertPublicHttpUrl`)를 약화하지 마세요. 상세는 `AGENTS.md` v1.34.
>
> **v1.33 메뉴명:** 사이드바 4번 메뉴의 표시 이름은 이제 **쇼핑제휴 상품 등록**입니다(이 문서의 "콘텐츠 소스"와 같은 화면, 주소 `?tab=sources`).
>
> **v1.32 주인님 결정:** 콘텐츠 소스 화면은 **포스팅할 상품 등록 용도**이며 블로그 등록은 삭제했습니다. 소스 종류는 당시 쿠팡 파트너스·네이버 브랜드 커넥트뿐이었고(위 4번 설명의 "블로그"는 v1.28 당시 기록), v1.79~80에서 알리익스프레스·토스쇼핑이 추가됐습니다. 이후 단계에서 블로그 RSS 수집을 다시 만들지 마세요.

### 5. 쿠팡 파트너스 상품 검색 → 소스 저장 (v1.30)

- 콘텐츠 소스 탭 상단 검색 패널. 회원 본인 `coupang_access_key`/`coupang_secret_key`로만 호출(`threads-content-ops/lib/coupang.ts`, 쇼핑제휴 자동화의 검증된 클라이언트를 복사), 고른 상품만 `tco_content_sources`(`source_type='coupang'`, `metadata`에 상품 정보)에 저장합니다.
- 쿠팡 제약(시간당 10회·키워드당 10개, 누적 매출 15만원 이후 키 활성화)과 제휴 링크 검사(일반 쇼핑 주소 거부), 미리보기는 일반 상품 주소로 열기 규칙은 `AGENTS.md` v1.30 항목을 보세요.
- 실제 키 호출 확인: 주인님이 실계정으로 검색해 상품 목록이 정상으로 나오는 것을 확인했습니다(2026-10-06). 같은 날 v1.31에서 검은 버튼 글자색 문제를 고쳤습니다 — 이 화면의 진한 배경 버튼은 `text-white` 대신 `text-[#ffffff]`를 쓰세요(`AGENTS.md` v1.31).

## 다음 구현 우선순위

다음 단계는 한 번에 모두 만들지 말고, 아래 순서를 지킵니다. 각 번호를 하나의 독립 작업 세트(구현 → 빌드 → 문서 → 커밋 → 푸시 → 루트 배포)로 끝냅니다.

1. ~~**콘텐츠 소스 큐 UI와 등록**~~ — **완료(v1.28, 2026-10-06).** 위 "4. 콘텐츠 소스 큐 UI와 등록" 참고.
2. ~~**쿠팡 파트너스 실제 검색 연동**~~ — **완료(v1.30, 2026-10-06).** 위 "5. 쿠팡 파트너스 상품 검색 → 소스 저장" 참고.
3. **네이버 브랜드 커넥트 링크 분석·등록**: 회원이 입력한 제휴 링크를 분석해 실제 결과만 큐에 저장합니다. 크롤링 또는 외부 연결이 필요하면 권한·정책·실제 응답을 먼저 검증합니다.
4. **계정별 즉시 초안 생성 흐름 확장**: 선택 소스와 계정 운영정보를 프롬프트에 넣어 초안을 만들고, 사용자가 검토한 뒤에만 명시적으로 발행합니다.
5. **댓글 관리**: Meta 공식 API로 실제 수집 가능한 댓글만 표시하고, AI 제안 답변과 최종 전송을 분리합니다. 자동 답글은 기본 OFF입니다.
6. **성과 리포트**: Meta/제휴 플랫폼에서 실제로 얻은 지표만 저장·표시합니다. 수집 권한·API가 없는 항목은 빈 상태와 설정 안내로 남깁니다.
7. **무인 예약 실행**: Vercel Cron 보안 설정, 큐 조회, 계정별 opt-in, 실행 이력, 실패 재시도, 중단 장치를 모두 갖춘 후에만 별도 단계로 구현합니다. 사전 환경변수·DB 스키마 변경은 주인님 승인 범위입니다.

## 핵심 금지사항과 검수 기준

- 운영자 API 키, 운영자 Meta 앱, 다른 회원의 토큰으로 절대 폴백하지 않습니다. 모든 외부 키·앱·계정은 회원 본인 것입니다.
- 모든 새 사용자 데이터는 `user_id`를 갖고 RLS owner-only 정책을 적용합니다. 서비스 롤을 쓰더라도 코드에서 `user_id` 필터를 유지합니다.
- API route/Server Action에는 `checkProgramAccessApi()` 또는 `requireProgramAccess()` 계열의 이용 권한 검사를 넣습니다. 로그인 확인만으로는 부족합니다.
- 권한을 읽는 `page.tsx`/`route.ts`에는 `dynamic = "force-dynamic"`와 `fetchCache = "force-no-store"`를 함께 둡니다.
- 자동화 UI는 선호 설정, 큐 대기, 실행 워커, 외부 발행 권한을 구분해 표시합니다. 아직 없는 기능을 `활성`, `발행 가능`, `실시간`처럼 표현하지 않습니다.
- 타 프로그램 UI를 참고할 때는 레이아웃·동작 규칙을 재사용하되, 원본의 다크 색상은 가져오지 않습니다. 사이드바는 `docs/SIDEBAR_LAYOUT_STANDARD.md`를 따르며 로그인 계정·로그아웃을 API 메뉴 바로 아래에 둡니다.
- 실제 유료 API 호출, 환경변수 변경, DB 스키마 변경, 외부 최종 발행은 루트 정책의 사전 승인 조건을 지킵니다.

## 배포와 인수인계 절차

이 프로그램은 루트 AIMaster 프로젝트의 경로입니다. `threads-content-ops/`에서 Vercel 배포를 실행하면 별도 프로젝트가 생기므로 실제 서비스 주소가 갱신되지 않습니다.

```powershell
# 이 폴더에서 기능 빌드
npm.cmd run build

# 저장소 루트에서 필요한 파일만 명시적으로 커밋
git add threads-content-ops/<changed-files> docs/HANDOFF.md docs/ERROR_LESSONS.md
git commit -m "feat(threads-content-ops): <요약>"
git push origin master

# 반드시 저장소 루트에서 실제 AIMaster 서비스 배포
vercel deploy --prod --yes --scope buylife
```

배포 뒤 `curl.exe -sS -I https://www.buylife.xyz/threads-content-ops`를 확인합니다. 비로그인 상태의 `307 → /login?redirect=...`는 정상입니다. `X-Vercel-Cache: MISS`를 확인해 권한 응답 캐싱이 없는지 봅니다.

## 최근 기준점

- 최신 기능 커밋: `git log --oneline -10 -- threads-content-ops "app/(dashboard)/threads-content-ops"`로 확인하세요(2026-10-08 기준 v1.86). 위 "★ 최신 작업 요약"이 현재 기준입니다.
- 운영 DB 버전: `programs.slug = 'threads-content-ops'`, `version = 'v1.86'`
- 실제 서비스 주소는 항상 `https://www.buylife.xyz/threads-content-ops`입니다(루트 AIMaster 프로젝트 배포).
- 작업 중인 다른 CLI의 변경을 섞지 않도록 `git add`는 반드시 파일 경로를 지정합니다. 루트의 `.analysis-threads-auto/`, `scratch/`, `debug.log`, 갱신 스크립트, `threads-content-ops/supabase/.temp/`는 이 기능 커밋에 포함하지 않습니다.
