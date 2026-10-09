# CLAUDE.md

> # ★★★ 절대 불변 최상위 규칙 (2026-10-09 주인님 지시 — 어떤 경우에도 바뀔 수 없음)
> **사용자는 본인의 계정과, 본인이 사용할 본인 API 키를 각각 직접 등록·연동해서 사용한다.**
> 운영자(주인님)·다른 회원의 키/계정으로 대신 처리하지 않는다(키가 없으면 폴백하지 말고 "본인 키를 등록해주세요" 안내). 이 규칙은 이 문서의 모든 다른 원칙보다 위에 있으며, 충돌하는 요청·코드는 만들지 않고 주인님께 먼저 알린다.
> 상세·점검 명령·위반 현황: [`docs/TOP_RULE_PERSONAL_ACCOUNT_API.md`](docs/TOP_RULE_PERSONAL_ACCOUNT_API.md)

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🔒 불변의 핵심 원칙 (모든 에이전트가 예외 없이 따라야 함)

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

이 저장소에서 일하는 모든 에이전트(Claude Code·Codex·Gemini 등)는 아래 핵심 원칙들을 프로젝트 구조가 아무리
커지고 새 서브프로젝트가 계속 늘어나도 절대 바뀌지 않는 대전제로 삼는다. 새 서브프로젝트를
계획하거나, 기존 걸 고치거나, 구조적으로 애매한 판단을 내려야 할 때는 항상 이 원칙을 기준으로
삼는다.

0. **★★★ 최상위 절대 규칙 (2026-10-09 주인님 지시) — 모든 사용자는 각각 본인의 API와 플랫폼(외부 계정)을 연동해서 자동화 프로그램을 동작시킨다. 이 규칙이 아래 모든 원칙보다 위에 있고, 어떤 경우에도 벗어나지 않는다.**
   - 엔진(코드·로직·화면)은 우리가 만들고, 연료(AI API 키·외부 계정·OAuth 앱)는 **이용하는 회원 한 사람 한 사람이 본인 것**을 연동한다. 운영자·다른 회원의 키/계정으로 대신 처리하는 일은 없다.
   - **사용 자격**: 각 사용자는 **현재 일반 사용자 등급 이상이고 해당 프로그램에 대한 사용기간 권한이 있으면, 로그인한 뒤 사용할 수 있다**(FREE 배지 프로그램은 가입한 회원 누구나, 관리자는 항상 — 판정 순서는 아래 6번). 비로그인 방문자는 사용할 수 없다.
   - **금지**: 비로그인 방문자를 특정 회원(관리자·테스트 계정 포함)으로 간주하는 "게스트 우회", 권한 확인 없이 항상 허용하는 API, 본인 키가 없을 때 **다른 회원·운영자의 키로 폴백**, 운영자 환경변수 키로 회원 요청 처리, 운영자 공용 OAuth 앱·공용 외부 키(예: 운영자 하나의 네이버 API 키를 모든 회원이 공유), 일반 회원이 공유 데이터를 수정하게 두는 것, 소유자 확인 없는 `upsert/update/delete`, 비밀 키를 코드·문서에 넣는 것(base64라도 금지), "시험 편의를 위한 임시 열어두기".
   - 시험은 **`buylifemall@naver.com`(일반 회원과 같은 권한의 테스트 계정)으로 실제 로그인해서** 하고, `buylifemall@gmail.com`은 유일한 관리자 계정이다. 우회로 시험하지 않는다.
   - 코드를 쓰기 전에 **[`docs/TOP_RULE_PERSONAL_ACCOUNT_API.md`](docs/TOP_RULE_PERSONAL_ACCOUNT_API.md)**(사용 자격·확인 체크리스트·위반 점검 명령·알려진 위반 현황·예외 기록)를 읽는다. 이 규칙과 충돌하는 요청은 만들지 않고 주인님께 먼저 알린다. 아래 2번(권한 통합)·4번(엔진/연료 구조)·멀티테넌시 원칙 1~4번은 이 규칙의 세부 구현이다.

1. **루트 폴더는 AIMaster이고, 모든 서브프로젝트는 각자의 서브폴더 안에서만 개발·관리·운영된다.**
   지금 있는 threads / ai-auto-blog / shots / insta_auto_poster / real_estate_sales / auto-detail-page
   뿐 아니라, **앞으로 새로 추가되는 모든 서브프로젝트도 예외 없이** `AIMaster/<프로그램명>/`
   서브폴더 하나 안에서 자기완결적으로 개발·배포된다. 별도 git 저장소를 새로 파거나, 이 저장소
   밖의 다른 위치(다른 로컬 클론 등)에서 독립적으로 개발하지 않는다 — 실제로 `auto-detail-page`가
   한동안 저장소 밖에서 별도 저장소(`BUYLIFEMALL/ShopPage`)로 개발되다가 2026-08-13에 이 원칙에
   맞춰 다시 편입된 사례가 있으니, 새 서브프로젝트를 시작할 때 처음부터 이 구조를 지킬 것
   (자세한 내용: 아래 "Platform-hub 구조" 섹션).
2. **모든 사용자의 모든 서브프로젝트 이용 권한(회원가입 포함)은 AIMaster 하나로 통합 관리된다.**
   회원가입, 로그인, 등급, 구독/결제, 서브프로젝트별 이용 권한(구독/개별부여/등급)은 전부
   AIMaster가 관리하는 Supabase DB 하나를 모든 서브프로젝트가 공유해서 나온다. 각 서브프로젝트는
   자기만의 회원가입 화면·권한 체계·API 키 저장 방식을 절대 새로 만들지 않고, 공용
   `requireProgramAccess()`/`checkProgramAccessApi()`/`user_api_keys`로 이 통합 권한을 확인·재사용
   한다 (자세한 내용: 아래 "멀티테넌시 원칙" 섹션).
3. **AI 이미지 생성 프롬프트에서 인물을 묘사할 때는 기본적으로 한국인으로 묘사한다.** 상세페이지
   섹션 이미지, 인스타/쓰레드 카드뉴스, 블로그 삽화, 쇼츠 스토리 캐릭터 등 사람이 등장할 수 있는
   이미지를 AI로 생성하는 모든 서브프로그램은, 프롬프트에 인물 묘사가 들어갈 때 별다른 지시가
   없으면 한국인(동아시아인) 외모로 묘사하도록 지시문을 넣는다. **콘텐츠 내용이 해외의 특정
   유명인·정치인·연예인·스포츠인을 다루거나, 명시적으로 해외 상황/장소를 묘사해야 하는 경우에만**
   그 맥락에 맞게 묘사한다(예: 해외 뉴스 기사 삽화, 특정 국가 배경이 필수인 여행/문화 콘텐츠).
   새 서브프로젝트에 이미지 생성 기능을 추가하거나 기존 프롬프트를 수정할 때도 이 원칙을 프롬프트
   설계 단계에서부터 반영할 것 (실제 적용 현황: 각 서브프로젝트의 이미지 프롬프트 생성
   함수/시스템 프롬프트 — `insta_auto_poster`/`threads`의 `generateVisualPrompts`,
   `shots`의 `SEGMENT_SYSTEM_PROMPT`, `blog`/`blog_auto_poster`의
   `generateArticleBasedImagePrompts`, `shop-detail-page`의 `shop_prompt_templates.korean_guide`,
   `auto-detail-page`의 `/api/generate-image` 참고).
4. **모든 자동화 프로그램은 "엔진은 우리(사용자+AI 에이전트)가 함께 만들고, 그 엔진을 돌리는
   연료(API 키·외부 계정)는 이용하는 각 회원이 본인 것을 연동해서 쓰는" 구조다.** 이 플랫폼에서
   개발자(사용자)와 AI 에이전트가 함께 만드는 것은 자동화가 실제로 돌아가는 코드·로직·UI(엔진)뿐이다
   — 그 엔진을 구동시키는 API 키(OpenAI/Gemini/Perplexity 등)와 외부 계정(Threads/Instagram/
   YouTube OAuth, 쿠팡파트너스/알리익스프레스 등)은 이 프로그램을 이용하는 각 회원이 설정
   페이지에서 **본인 것을 직접 연동**해서 각자 자신만의 자동화 시스템을 구축해 쓴다. 운영자
   (buylifemall)의 API 키나 계정을 다른 회원이 대신 쓰는 구조는 절대 만들지 않는다.
   - 이 컨셉은 이미 아래 "멀티테넌시 원칙" 3번(API 키는 본인 키만 사용, 폴백 금지)과 4번(외부
     계정은 사용자별로 저장)에 기술적으로 구현돼 있다 — 이 항목은 그 두 규칙이 "왜" 존재하는지의
     제품 근본 컨셉을 명시해둔 것이다.
   - **새 서브프로젝트를 기획하는 첫 단계부터 이 기준으로 판단할 것**: "이 기능에 필요한 API나
     외부 계정을 회원이 본인 걸로 연동해서 각자 자기 자동화를 돌릴 수 있는 구조인가?"를 가장
     먼저 확인한다. 여기서 벗어나는 아이디어(예: 운영자 개인 데이터·계정에만 의존해서 다른
     회원은 절대 쓸 수 없는 내부 도구성 기능)는 이 플랫폼의 표준 판매 모델과 맞지 않으니, 그런
     요청이 들어오면 "이게 회원용 SaaS 기능인지, 운영자 전용 내부 도구인지"부터 사용자와 확인하고
     내부 도구라면 이 저장소 밖(또는 별도로 명확히 구분된 위치)에서 관리할지 상의한다.
   - **"외부 계정 연동" 기능이 있는 프로그램은, OAuth 앱(Client ID/Secret, App ID/Secret 등) 자체도
     반드시 회원 본인이 직접 만들어 본인 계정으로 등록하게 한다 — 운영자가 미리 만들어둔 앱을
     여러 회원이 같이 쓰는 "공용 앱" 구조는 (계정 연동이 필요 없는 기능은 예외로 하고) 절대 쓰지
     않는다.** `user_id`별로 토큰만 분리 저장하는 것으로는 충분하지 않다 — 그 앱 자체가 여전히
     운영자 한 명 소유면, Meta처럼 앱이 "심사 전 개발 모드"인 플랫폼에서는 운영자가 그 앱의
     "테스터"로 등록해준 사람 외에는 **아예 인증 자체가 거부된다**. 이 구멍은 코드 리뷰로는 잘
     안 보이고 실제로 다른 회원이 연동을 시도해봐야 드러난다.
     - **감사 이력**: 2026-09-16, `threads/`(쓰레드 자동포스팅)와 `threads-affiliate-poster`
       (쓰레드 쇼핑제휴 자동화) 둘 다 운영자가 만든 공용 Meta 앱 하나를 `THREADS_APP_ID`/
       `THREADS_APP_SECRET` 환경변수로 공유해서 쓰고 있었다. 그 앱이 아직 "라이브" 심사를
       안 받은 개발 모드였고 테스터로는 운영자 본인 계정 하나만 등록돼 있어서, 다른 회원
       (`40golentime04@gmail.com`)이 연동을 시도하자 "앱 ID를 인식할 수 없다"는 에러로
       실패했다 — 운영자 본인 계정으로는 아무 문제 없이 됐기 때문에 그 전까지 발견되지 못한
       버그였다. `threads-comment-reply`(쓰레드 댓글자동화)는 처음부터 회원마다 본인 Meta
       앱 ID/Secret을 `user_api_keys`에 등록하는 방식으로 만들어져 있어 이 문제가 없었고,
       이 패턴을 기준으로 나머지 두 프로그램도 전환했다. 새 서브프로젝트에서 OAuth 연동을
       설계할 때는 항상 이 3번째 프로그램의 구현(회원별 앱 등록)을 기본값으로 삼을 것 — 대상
       플랫폼의 로그인 API가 앱 심사 없이 모든 사용자를 즉시 받아주는 게 확실할 때만(예:
       네이버 로그인 오픈 API) 공용 앱 예외를 검토하고, 그 경우에도 사용자와 먼저 확인한다.

5. **모든 서브 자동화 프로그램은 버전을 관리하고, 수정할 때마다 버전을 올린다 (2026-09-29 주인님 지시).**
   - **형식**: `v<메이저>.<두 자리 마이너>` — 예: `v1.01`, `v1.02`, `v2.01`. (DB 제약: `^v[0-9]+\.[0-9]{2}$`)
   - **시작점**: 2026-09-29 버전 관리 시작 시점의 모든 프로그램은 `v1.00`이었고, 같은 날 전부 `v1.01`로 지정했다.
   - **작은 수정(버그 수정·기능 보완·화면 변경 등)**: 그 프로그램을 수정해서 배포할 때마다 마이너를 0.01씩 올린다
     (`v1.01 → v1.02 → v1.03 …`). 한 번의 작업(배포 1회)에 1씩만 올린다.
   - **큰 변경(주인님이 "어느 정도 완성됐다"거나 "기능이 크게 바뀌었다"고 판단할 때)**: 메이저를 올리고 마이너는 01부터
     다시 시작한다(`v1.37 → v2.01`). **메이저는 주인님이 지시할 때만 올린다** — 에이전트가 임의로 올리지 않는다.
   - **버전 값은 두 곳에 같이 적고, 같은 작업에서 함께 바꾼다**:
     1. 각 서브프로젝트 코드의 `lib/version.ts`(또는 `src/lib/version.ts`)의 `APP_VERSION` — 좌측 메뉴 제목 밑에 표시된다.
     2. 공용 DB `programs.version` — 메인 사이트 프로그램 목록·상세 페이지에 표시되고, 관리자 프로그램 편집 화면에서도 고칠 수 있다.
        (MCP `execute_sql`로 `update programs set version = 'v1.02' where slug = '<slug>';`)
   - 여러 프로그램을 한꺼번에 고치면(예: 전체 사이드바 수정) **고친 프로그램마다 각각** 올린다. 손대지 않은 프로그램은 올리지 않는다.
   - 커밋 메시지와 그 프로그램의 `AGENTS.md`/`README.md` 작업 기록에 바뀐 버전을 함께 적는다(예: `feat(threads): ... (v1.02)`).
   - **새 서브프로젝트는 `v1.01`로 시작**한다: `lib/version.ts` 생성 + 사이드바 제목 밑에 `{APP_VERSION}` 표시 +
     `programs` 등록 시 `version = 'v1.01'`.
   - 크롬 확장 `manifest.json`의 `version`, Electron `package.json`의 `version`처럼 배포 도구가 형식을 강제하는 기술 버전은
     그대로 두고(숫자 앞자리 0 불가 등), 회원에게 보이는 버전만 이 규칙을 따른다.

6. **사이트·프로그램 이용 권한 기본규칙 (2026-09-30 주인님 확정, 2026-10-06 권한 보장 지침 강화)**
   - **FREE 배지(`programs.badges`에 `free`)가 달린 프로그램은 AIMaster에 가입만 하면 누구나 사용할 수 있다 — 등급과 무관하다.**
     주인님이 등급을 바꿔주거나 사용기간을 넣어주지 않아도 가입 즉시 쓸 수 있어야 한다(등급이 비어 있는 신규 가입자 포함).
     회원가입 유도용 무료 프로그램(예: 타로 `tarot-reading`, 캐릭코드 `mbti-character`, 성격코드 `personality-code`)은 이 배지로 운영한다.
   - **FREE 배지가 없는 프로그램은 ① 결제한 구독이 있거나, ② "일반" 등급 이상이면서 주인님이 넣어준 사용기간
     (`user_program_access.expires_at`, 비우면 무기한)이 남아 있어야 사용할 수 있다.**
     즉, 회원이 일반 등급 이상이고 관리자가 부여한 해당 프로그램 사용 권한(사용기간)이 등록되어 있으면, 구독요청 페이지로 튕기지 않고 프로그램으로 즉시 정상 접근할 수 있어야 한다.
   - **[핵심 기술 규칙 - 서브프로그램 requireProgramAccess()의 createAdminClient() 필수 사용 (2026-10-06 확정)]**:
     서브프로그램의 `requireProgramAccess()`에서 테이블 조회를 일반 세션 쿠키 클라이언트(`createClient()`)로 수행하면, Supabase RLS 정책 또는 Vercel 서브도메인 쿠키 미전달로 인해 `user_program_access`가 빈 값으로 떨어지거나 오류가 발생해 유효한 등급/권한 보유자가 구독요청 페이지로 잘못 튕기는 치명적인 사고가 발생한다.
     따라서 **회원 본인 인증(로그인 상태 확인)은 `requireUser()`(쿠키 SSR)로 수행하되, 권한 판정에 필요한 DB 테이블(`profiles`, `programs`, `subscriptions`, `user_program_access`) 조사는 반드시 `createAdminClient()`(Service Role Key)로 수행하여 RLS 차단 없이 100% 안전하게 판정해야 한다.**
   - 관리자(`profiles.is_admin`)는 항상 사용 가능, 정지 계정(`profiles.is_suspended`)은 항상 차단.
   - 판정 순서(모든 판정 코드 공통): 정지 → 관리자 → **FREE 배지** → 결제 구독 → 개별 부여 권한(`user_program_access`) → (최소 등급 미지정 시 허용) → 등급 ≥ 최소 등급 **그리고** 사용기간 → 그 외 차단.
     **FREE 배지 확인은 반드시 등급·사용기간 확인보다 먼저** 둔다(그래야 등급 없는 가입자도 열린다).
   - 적용 위치: 루트 `lib/access/checkProgramAccess.ts`(`evaluateProgramAccess`), 각 서브프로젝트 `lib/access.ts`
     (`requireProgramAccess`/`checkProgramAccessApi`). **새 프로그램도 이 순서 그대로 만든다.** 상세는 아래 "이용 권한 판정 정책".
   - 프로그램을 무료로 풀거나 다시 유료로 바꿀 때는 코드를 고치지 말고 **관리자 프로그램 편집 화면에서 FREE 배지를 켜고 끄면 된다.**

7. **작업 중 찾은 에러·해결 방법·중요 점검 사항은 즉시 `docs/ERROR_LESSONS.md`(작업 중요 지침)에 기록하고, 모든 CLI는 작업 시작 전에 이 문서를 먼저 읽는다 (2026-10-01 주인님 지시).**
   - **읽기**: Claude Code·Codex·Gemini 등 어떤 도구든 작업을 시작할 때 `docs/HANDOFF.md`와 함께 `docs/ERROR_LESSONS.md`를 먼저 읽고,
     "A. 작업 전 점검 체크리스트"를 확인한 뒤 코드를 고친다. 같은 실수를 다른 CLI가 반복하지 않게 하는 것이 목적이다.
   - **쓰기**: 작업하다가 ① 에러를 해결했거나 ② 원인이 비직관적인 문제를 찾았거나 ③ 다음에 꼭 확인해야 할 점검 사항을 발견하면,
     그 작업의 **같은 커밋**에 `docs/ERROR_LESSONS.md`의 해당 분류(배포·환경변수/DB·확장/자동화·터미널·외부 연동 등)에
     "증상 → 원인 → 해결(파일 위치) → 다음부터 확인" 형식으로 한 항목을 추가한다(날짜·프로그램·버전 포함).
     서브프로젝트에만 해당하는 긴 설명은 그 폴더 `AGENTS.md`에 쓰고, 이 문서에는 한 줄 요약과 위치를 남긴다.
   - 저장소 밖(Claude 메모리, plan 파일)에만 남기는 것은 기록으로 인정하지 않는다. 다른 CLI가 볼 수 있는 저장소 문서에 남겨야 한다.

8. **모든 콘텐츠 생성 및 AI 프롬프트는 항상 당해 연도(현재 2026년) 기준으로 작성한다 (2026-10-07 주인님 지시).**
   - **배경**: OpenAI GPT-4o, Claude, Gemini 등 대형 언어 모델은 학습 데이터 컷오프(2023~2024년)로 인해 명시적인 연도 지정이 없으면 자동으로 과거 연도(2023년, 2024년 등)를 현재 시점인 것처럼 착각하여 글·제목·지원금·트렌드 정보를 작성하는 치명적인 결함이 있다.
   - **불변 원칙**: 블로그 글, SNS 피드, 숏폼 대본, 상세페이지, 글감 수집, 제목, 본문, 요약, 태그, 정책/지원금 안내 등 모든 AI 결과물은 **항상 당해 연도(현재 2026년)**를 기준으로 작성되어야 한다. 과거 연도(2023년, 2024년 등)를 현재인 것처럼 쓰거나 과거 시점으로 후퇴하는 것을 엄격히 금지한다.
   - **구현 규칙**: AI 프롬프트(시스템 프롬프트, 사용자 프롬프트, 템플릿)를 작성할 때는 `const currentYear = new Date().getFullYear();` 등을 동적으로 주입하여, 해가 바뀌어도 항상 당해 연도 기준이 유지되도록 설계한다. 프롬프트 내에 `[기준 연도 엄수: 현재 연도는 ${currentYear}년입니다. 모든 연도 표기, 정책, 정보, 가이드, 제목은 반드시 ${currentYear}년(당해 연도)을 기준으로 작성하세요. 과거 연도(2023년, 2024년 등)로 퇴행하지 마세요.]` 강력한 지침을 필수 포함한다.

9. **AI 사용량·한도 확인 요청 시 주간/5시간 계산 및 표시 규칙 (2026-10-08 주인님 지시)**
   - **배경**: 사용자가 "사용량 체크해줘", "사용량 확인해줘" 등으로 AI 모델의 사용량 및 쿼터 확인을 요청할 때, 오르카(Orca) 상태 표시줄이나 CLI 세션을 오독하여 소진량과 잔여량을 거꾸로 안내하는 오류를 원천 차단한다.
   - **오르카 표시 해석 핵심 불변 규칙**:
     - 오르카 하단 상태바의 `XX% 사용` 표시는 남은 양(Remaining)이 아니라 **"이미 사용된 소진율(Used)"**이다.
     - 따라서 남은 잔여량(Remaining)은 항상 **`100% - 사용%`**로 정확히 역산하여 계산해야 한다.
       - 예 1: `97% 사용` ➔ **97% 사용 완료, 남은 잔여량은 단 3% (주간 한도 소진 직전 긴급 경고)**
       - 예 2: `1% 사용` ➔ **1% 사용 완료, 남은 잔여량은 99% (매우 여유로움)**
       - 예 3: `100% 사용` ➔ **100% 사용 완료, 남은 잔여량 0% (한도 일시 소진 / 쿨다운 대기 필요)**
       - 예 4: `50% 사용` ➔ **50% 사용 완료, 남은 잔여량 50% (절반 남음)**
   - **보고 표준 형식 (필수)**:
     1. **표 형태 요약**: 모델별(Gemini/Antigravity, Claude, GPT/Codex)로 **주간 한도(Weekly Limit)**와 **5시간 단기 한도(Five Hour Limit)**의 사용량 및 실제 남은 잔여량을 구분하여 명확한 표로 제시한다.
     2. **위험도 및 전략 안내**: 특정 모델이 소진 직전(잔여 10% 이하)이거나 이미 100% 소진된 경우 이를 경고하고, 잔여량이 충분한 다른 모델로 작업을 분산하거나 리셋 쿨다운 대기를 안내한다.

10. **크롬 확장 프로그램 운영 규칙 — 프로그램을 업데이트하면 확장 폴더·다운로드 파일·DB 버전이 한 번에 함께 바뀌어야 한다 (2026-10-09 주인님 지시, 모든 CLI 공통).**
   - **배경**: 확장(`<프로그램>/extension/`)은 사이트 코드와 따로 배포되기 쉬워, 코드만 올리고 확장 폴더·ZIP·DB 버전이 서로 다른 버전으로 남는 사고가 생긴다. 회원이 받는 파일과 사이트가 말하는 버전이 항상 같아야 한다.
   - **확장 소스의 위치는 항상 `<프로그램>/extension/` 하나다.** 확장 동작을 바꾸면 이 폴더의 실제 파일을 고친다(루트 폴더나 다른 위치에 복제본을 만들지 않는다).
   - **그 프로그램을 업데이트·배포하는 같은 작업(같은 커밋·같은 배포)에서 아래 4가지를 반드시 함께 처리한다.** 하나라도 빠지면 작업이 끝난 것이 아니다.
     1. **확장 폴더 반영 (프로그램이 업데이트되면 `extension/` 폴더도 반드시 그 업데이트된 내용으로 갱신한다)**: 업데이트가 확장과 관련 있으면(확장이 호출하는 서버 API·원고 형식·화면 흐름·설정값이 바뀐 경우 포함) `extension/` 안의 실제 코드를 함께 고치고, 관련이 없어도 아래 버전 일치와 ZIP 재생성은 생략하지 않는다. `extension/manifest.json`의 `version`(Chrome 규격 `메이저.마이너.0`)과 `version_name`(`vX.YY`)이 프로그램 버전(`lib/version.ts`)과 같아야 한다. 빌드 스크립트(`scripts/build-extension-archive.mjs`)가 자동으로 맞추는 프로그램은 그 스크립트가 돌았는지 확인하고, 스크립트가 없는 프로그램은 손으로 맞춘다.
     2. **다운로드 파일 교체**: 확장 폴더 내용(폴더 자체가 아니라 내용물)을 ZIP으로 만들어 **기존 다운로드 주소·파일명 그대로** 최신으로 바꾼다. 방식은 프로그램별 기존 방식을 따르고 새 방식을 만들지 않는다 — 사이트 포함형(`public/downloads/<프로그램>-extension-latest.zip` + 버전 파일, 배포에 포함)이 기본이고, `naver-blog-auto-poster_web`은 GitHub 릴리스 `gh release upload … --clobber`(같은 릴리스·같은 파일명)를 쓴다.
     3. **DB 갱신**: 공용 DB `programs`의 `version`을 같은 버전으로 올리면서(핵심 원칙 5번) **`extension_version`(=ZIP 안 `version_name`)과 `extension_download_url`(최신 ZIP 주소)도 같은 SQL에서 함께 갱신한다** — 예: `update programs set version='v1.50', extension_version='v1.50', extension_download_url='<최신 ZIP 주소>', updated_at=now() where slug='<slug>';`. 버전 마이그레이션 SQL 파일에도 같은 내용을 남긴다. 확장이 있는 프로그램에 이 두 칸이 비어 있으면 그 작업에서 채운다.
     4. **배포 후 실물 검증**: `node scripts/check-extension-release.mjs <slug>`를 실행해 `OK`를 확인한다. 이 스크립트는 DB 값과 라이브 ZIP을 실제로 내려받아 연 `manifest.json`의 `version_name`을 비교한다(필요하면 핵심 파일 해시도 로컬과 비교). 업로드했다는 사실만으로 성공이라 보고하지 않는다.
   - **회원 PC에 설치된 확장은 자동으로 바뀌지 않는다**(압축 해제 방식). 확장을 바꾼 배포의 완료 보고에는 항상 "ZIP 다시 받기 → 기존 폴더에 덮어쓰기 → `chrome://extensions`에서 새로고침" 안내를 넣는다. 새 확장 프로그램이나 크게 고치는 확장에는 서버가 알려주는 최신 버전과 비교해 팝업에서 "새 버전이 있습니다"를 보여주는 기능을 목표로 한다(현황은 각 프로그램 `AGENTS.md`).
   - **확장 ↔ 서버 API 계약**: 서버 응답을 바꾸면 이미 설치된 옛 확장이 깨지지 않게 하위 호환을 유지하거나, 최소 지원 버전을 확장이 알 수 있게 한다. 서버만 고친 배포라도 프로그램 버전은 올린다(핵심 원칙 5번).
   - **상세 절차·프로그램별 다운로드 주소·예외·새 확장 프로그램 만드는 법은 [`docs/EXTENSION_RELEASE_RULES.md`](docs/EXTENSION_RELEASE_RULES.md)에 있다. 확장이 있는 프로그램을 배포하기 전에 반드시 읽는다.**
   - **현황(2026-10-09)**: 확장이 있는 5개 프로그램(`naver-blog-agent`·`ai-auto-blog`·`naver-blog-seo-studio`·`tistory-auto-blog`·`naver-blog-auto-poster-web`)의 DB 칸(`programs.extension_download_url`/`extension_version`)을 2026-10-09 채우고 검증 스크립트로 확인했다(5개 모두 OK). DB 갱신은 배포 때 SQL로 수동이다. **확장 내 새 버전 알림은 확장이 있는 5개 프로그램 모두에 있다(`naver-blog-agent`·`naver-blog-seo-studio`·`ai-auto-blog`·`naver-blog-auto-poster-web`·`tistory-auto-blog`)(현황표: `docs/EXTENSION_RELEASE_RULES.md`). 메인 사이트 프로그램 상세의 다운로드 버튼은 미구현**. `ai-auto-blog`·`naver-blog-seo-studio`·`tistory-auto-blog`는 같은 빌드 스크립트 방식, `naver-blog-auto-poster_web`은 GitHub 릴리스 방식이다. 새로 손대는 프로그램은 이 규칙에 맞춰 부족한 항목을 채운다.

## Communication

- 기본적으로 한국어로 대화한다.
- 전문적인 기술용어가 꼭 필요한 경우에만 필요한 만큼만 영어를 사용한다.
- 답변은 간결하고 실용적으로 작성한다.
- 이 `CLAUDE.md`의 지침을 이 저장소의 기본 대화 규칙으로 우선 적용한다.

- 답변은 기술 용어(API, RLS, 파일 경로, 함수명, 라이브러리명 등)를 제외하고 한글로 작성한다.
- 전달 내용은 비전문가도 이해하기 쉽게, 쉬운 한글 표현으로 풀어서 설명한다. 불가피하게 기술/전문 용어를 쓸 때를 제외하면 어려운 표현이나 번역체를 피한다.
- **문장 끝맺음은 전문적이지만 정중한 존댓말(-습니다/-합니다/-드립니다체)을 쓴다.** 바이브코딩 AI 전문가 컨설턴트가 클라이언트에게 보고하는 톤이다 — 캐주얼한 반말체(-다/-았다/-했다, -야/-네)나 지나치게 딱딱한 로봇체는 피한다. 특히 도구 호출이 많은 긴 작업 뒤 마지막 요약 문단에서 말투가 평서체로 흐트러지기 쉬우니, 답변을 보내기 전에 문장 끝맺음을 한 번 더 확인한다.
- 이 지침은 루트 AIMaster뿐 아니라 threads, blog, shots 등 모든 서브프로젝트 작업에도 동일하게 적용되는 메인 지침이다. 각 서브프로젝트의 CLAUDE.md/AGENTS.md는 이 파일을 함께 읽도록 안내한다.

## 클라우드 세션(Claude Code on the web 등)에서 작업할 때 (2026-10-01 주인님 지시)

- 클라우드 세션은 로컬 작업과 섞이지 않도록 **GitHub의 `cloud-work` 브랜치에서만** 작업한다. 지침·코드·작업 규칙은 로컬과 **완전히 같다**(이 파일 전체 적용).
- 추가 규칙은 **[`docs/CLOUD_SESSION.md`](docs/CLOUD_SESSION.md)** — 시작 시 `git merge origin/master`로 로컬 최신 받기, 커밋·푸시는 `cloud-work`에만(`master` 직접 푸시 금지),
  **배포·버전 올리기·DB 쓰기·비밀값 입력은 클라우드에서 하지 않고 로컬 병합 때 처리**, 마칠 때 `PROGRESS.md` 5번 표에 기록.
- 클라우드 세션이 시작되면 `.claude/settings.json`의 SessionStart 훅(`scripts/cloud-session-start.mjs`)이 이 규칙과 현재 브랜치를 자동으로 띄운다(로컬에서는 아무것도 안 함).
- 로컬 세션은 `cloud-work`의 작업을 `docs/CLOUD_SESSION.md` 5번 절차로 `master`에 합친 뒤 버전·빌드·배포한다. **로컬 폴더를 `cloud-work`로 checkout하지 않는다**(Codex 등과 같이 쓰는 폴더).

## 작업 자율성 지침

- **★ [단일 작업 세트 불변칙] 사용자의 기능 요청이나 단계별 작업이 완료되면, 질문 없이 다음 4단계를 무조건 하나의 연계된 '자동 작업 세트'로 처리하고 보고한다 (2026-09-23 주인님 지시사항):**
  1. **로컬 빌드 검수**: 해당 서브프로젝트에서 `npm run build`로 타입 및 컴파일 사전 검수 완료
  2. **Git Commit**: 변경 내용을 명확한 커밋 메시지로 로컬 커밋
  3. **Git Push**: `git push origin master`로 원격 저장소 상시 동기화
  4. **Vercel 프로덕션 배포 & 라이브 보고**: `vercel deploy --prod --yes`로 실제 서버 반영 후 라이브 URL과 함께 보고
  5. **인수인계 문서 반영 (2026-09-29 주인님 지시 — 매 작업 필수)**: 다른 CLI(Codex, Gemini, 다른 Claude 세션)가
     이 대화를 보지 못해도 바로 이어서 작업할 수 있도록, 작업이 끝날 때마다 해당 서브프로젝트의 `AGENTS.md`/`README.md`
     (진행 상태 표·트러블슈팅·남은 일)와, 플랫폼 전체에 영향이 있으면 루트 `AGENTS.md` §5 감사 이력/§10 교훈,
     재사용 규칙이면 `docs/PLATFORM_PATTERNS.md`에 "무엇을·왜 바꿨고·무엇이 남았는지"를 기록하고 같은 커밋에 포함한다.
     **에러를 해결했거나 중요 점검 사항을 찾았으면 `docs/ERROR_LESSONS.md`에도 반드시 추가한다(핵심 원칙 7번).**
     저장소 밖(Claude 메모리, plan 파일)에만 남기는 것은 인수인계로 인정하지 않는다.
- **여러 CLI가 같은 작업 폴더를 동시에 쓴다(2026-09-29 확인)**: 같은 로컬 저장소에서 Codex 등 다른 도구가 동시에 작업하고
  커밋한다. 스테이징 영역(index)도 공유되므로 `git add`/`git rm`으로 올려둔 변경이 다른 도구의 커밋에 섞여 들어갈 수 있다
  (실제로 타로 이미지 삭제가 Codex의 seo-studio 커밋에 포함됨). 스테이징은 커밋 직전에 하고 바로 커밋하며, 주인님이 "다른
  CLI가 작업 중"이라고 한 서브프로젝트는 건드리지 않는다.
- **작업을 시작할 때 `docs/HANDOFF.md`(지금 멈춰 있는 일·남은 일·다른 CLI가 작업 중인 폴더)와 `docs/ERROR_LESSONS.md`(에러 해결 기록·점검 체크리스트)를 먼저 확인하고,
  작업을 끝내면 그 문서의 표를 같은 커밋으로 갱신한다.**
- **새 서브프로젝트를 시작하거나 기존 서브프로젝트를 이어서 작업할 때는, 코드를 만들기 전에
  반드시 이 루트 `CLAUDE.md`와 해당 서브프로젝트의 `AGENTS.md`/`README.md`를 먼저 확인하고
  그 지침을 그대로 따른다.**
- 작업 도중 사소한 선택이나 구현 방식은 재질문하지 말고 합리적으로 판단하여 진행한다.
- **Codex 자율 실행 위임 (2026-10-03 주인님 확정)**: 사용자의 기능 요청은 필요한 조사·코드 수정·파일 생성·의존성 설치·로컬/브라우저 검수·오류 수정·문서화·커밋·푸시·프로덕션 배포까지의 일괄 실행 권한으로 해석한다. 세부 구현 방식, 파일 위치, 테스트 표본, 커밋 메시지, 배포 순서는 에이전트가 안정성·기존 패턴·비용을 기준으로 결정하며 중간 승인이나 진행 질문을 하지 않는다. 실패하면 스스로 로그·실제 화면·기존 성공 버전을 대조해 복구하고 재검수한다. 단, **파괴적 삭제/force-push, 비밀번호·API 키 변경, 환경변수·DB 스키마 변경, 유료 API 대량 호출, 회원 대신 최종 발행·결제·외부 공개**만 사전 승인을 받는다. 도구가 보안상 별도 승인을 요구하는 경우에는 필요한 한 번의 승인 요청만 한다.
- 기존 프로젝트의 코드 구조, 디자인, 명명 규칙을 우선하여 따른다.
- **모든 웹 서브프로그램의 작업 화면은 흰색 베이스로 통일한다(2026-10-06 주인님 확정).** 메인 AIMaster의 다크 랜딩/카탈로그 또는 설치형 원본의 다크 화면을 웹 작업 화면에 복제하지 않는다. 본문·카드·입력은 흰색 또는 아주 옅은 중성색, 경계는 중성 회색, 본문 글자는 어두운 색으로 구성하고, 브랜드색은 선택·상태·위험 표시처럼 필요한 곳에만 쓴다. 구현 전 같은 성격의 기존 웹 프로그램과 `docs/SIDEBAR_LAYOUT_STANDARD.md`를 확인해 번호형 작업 흐름·API키등록·플랫폼연동·계정·로그아웃 위치까지 맞춘다.
- 필요한 파일 생성, 코드 수정, 패키지 설치, 테스트 및 오류 수정까지 연속해서 수행한다.
- 하나의 작업이 끝날 때까지 중간 확인을 최소화한다.
- 선택지가 여러 개이면 유지보수성, 안정성, 보편성을 기준으로 가장 적합한 방법을 선택한다.
- 파괴적인 작업(데이터 삭제, force-push), 비밀번호/API 키 변경, DB 스키마/환경변수 변경만 질문한다.
- 작업 완료 후에는 **무엇을 작업했는지**, **빌드·검수·커밋·푸시·배포 결과**, **해당 프로그램의 라이브 링크**를 빠짐없이 함께 보고한다. 링크만 단독으로 제공하거나 작업 결과를 생략하지 않는다.


## 참고 자료 기본 검색 폴더

- 사용자가 대화 중 파일명만 언급하며(예: "리스트.png") 스크린샷/엑셀/문서 등을 참고하라고
  하면, 그 파일은 기본적으로 **`D:\PDS`** 폴더(및 하위 폴더) 안에 있다(2026-09-10부터 사용자가
  이 폴더에 자료를 모아 저장하기로 함). 파일이 안 보인다고 바로 사용자에게 되묻지 말고,
  먼저 `D:\PDS`를 검색해서 찾아볼 것.

## Reusable Patterns

- 카테고리 블록 노출, AI 3종 콘텐츠 수집(HTTP/RSS/Perplexity), SNS 게시글 AI 생성 프롬프트 규격, 이메일(SMTP) 발송, 삭제 버튼 처리중 표시, **AI 이미지 생성(마케팅/썸네일)**, **공식 API 없는 서비스의 브라우저 자동화(봇 탐지 회피 원칙, §20)** 등 여러 서브프로젝트에서 재사용 가능한 패턴과 트러블슈팅은 [`docs/PLATFORM_PATTERNS.md`](docs/PLATFORM_PATTERNS.md)에 정리되어 있다. 새 프로그램을 만들거나 비슷한 기능이 필요하면 먼저 이 문서를 확인할 것.
- **네이버 블로그처럼 공식 포스팅/액션 API가 없어서 Playwright 등으로 실제 화면을 사람 대신
  조작해야 하는 서브프로젝트를 만들거나 이어받을 때는, 다른 어떤 작업보다 먼저
  `docs/PLATFORM_PATTERNS.md` §20("공식 API 없는 서비스를 브라우저 자동화로 만들 때 —
  봇 탐지 회피는 최우선 원칙")를 읽고 그 규칙을 처음부터 적용할 것 — 사후에 추가하지
  않는다.** 참고 구현은 `naver-blog-auto-poster_app/src/lib/humanInput.js`(사람처럼 클릭+
  타이핑, 데스크톱 앱)와 `naver-blog-auto-poster_app/AGENTS.md`/
  `naver-blog-auto-poster_web/AGENTS.md`(개발 방법론 전체, 데스크톱/크롬 확장 각각) — 새로
  설계하지 말고 그대로 재사용한다(2026-09-21 사용자가 "항상 이 룰을 지킬 수 있도록 메인
  지침으로 저장해두라"고 명시적으로 지시함). 이 두 폴더는 2026-09-21에 코드/문서뿐
  아니라 `programs` 등록·요금제·이용권한까지 전부 분리돼, 지금은 서로 독립적으로
  결제해야 하는 별도의 두 유료 프로그램(`naver-blog-auto-poster`,
  `naver-blog-auto-poster-web`)이다 — 자동화 로직 자체가 서로 다르고 유지보수 속도도
  다르다는 게 이유였다.
- **AI 이미지 생성은 Cloudinary의 `generate-image`(대행 생성) API를 거치지 않는다.** Gemini(나노바나나)를 직접 호출해서 생성하고, 결과는 Cloudinary가 아닌 Supabase Storage의 public 버킷에 업로드한 뒤 그 공개 URL을 DB에 저장한다 — 이유와 구체적 방법은 `docs/PLATFORM_PATTERNS.md` §12 참고. Cloudinary의 대행 생성 기능은 월 50회라는 별도 한도가 있어(저장공간·업로드 개수와 무관) 쉽게 소진되고, 그 경우 새 이미지 생성이 막힌다.

## Commands

```bash
npm run dev       # Start dev server (http://localhost:3000)
npm run build     # Production build
npm run lint      # ESLint check
```

## Architecture

**AI Master** — 마케팅 자동화 프로그램 판매 사이트

Stack: Next.js 14 App Router + TypeScript + Tailwind CSS + Supabase + 페이앱(Payapp)

### Platform-hub 구조 (서브프로젝트 원칙)
- threads, blog 등 각 자동화 프로그램은 별개의 독립 프로젝트가 아니라, **AIMaster 저장소 하나 안의 서브폴더(서브프로젝트)**로 개발·관리한다.
- **앞으로 새로 추가하는 프로그램도 동일하게 AIMaster 안의 서브폴더(예: `AIMaster/<프로그램명>/`)로 만든다.** 별도 git 저장소를 새로 만들지 않는다.
- 각 서브프로젝트는 자체 `package.json`/`node_modules`/`tsconfig.json`과 자체 Vercel 배포(별도 프로젝트로 build & deploy)를 가진다.
- 단, Supabase DB(회원/인증/등급/결제 등 공용 테이블)는 AIMaster 전체가 하나만 공유한다. 새 프로그램용 테이블이 필요하면 이 공용 DB에 추가한다 — 별도 Supabase 프로젝트를 새로 만들지 않는다.
- 루트 AIMaster 앱의 `app/(main)/<프로그램>/` 라우트가 해당 서브프로젝트의 컴포넌트를 직접 import해서 렌더링하는 경우, `tailwind.config.ts`의 `content`에 그 서브프로젝트 경로를 추가해야 하고, `next.config.mjs`의 `typescript.ignoreBuildErrors`로 서브프로젝트 간 타입 교차오염을 우회하고 있다 (각 서브프로젝트는 자체 `npm run build`로 별도 타입 검증됨).

### 서브프로젝트 작업물은 반드시 해당 서브프로젝트 폴더 안에서 관리한다
- 새 서브프로젝트를 계획(plan)하거나 개발할 때, **실제 작업 산출물(코드, DB 마이그레이션 SQL, 설계 이유·아키텍처 결정 문서 등)은 전부 그 서브프로젝트 폴더(`<프로그램명>/`) 안에 저장**한다. 저장소 밖(예: Claude Code의 `~/.claude/plans/*.md` 같은 plan-mode 산출물)이나 루트 `docs/`에만 흩어놓고 끝내지 않는다.
  - DB 마이그레이션: MCP/대시보드로 즉시 적용했더라도, 적용한 SQL을 반드시 `<프로그램명>/supabase/migrations/`에 파일로 남긴다 (threads/real_estate_sales 참고).
  - 설계 배경/아키텍처 결정: `<프로그램명>/README.md`에 "왜 이렇게 만들었는지"를 정리한다 (환경변수, 배포 방법, 남은 작업 포함).
  - Claude Code의 plan-mode로 계획을 짰다면, 구현이 끝난 뒤 핵심 결정 사항을 위 README로 옮겨 남긴다 — plan 파일 자체는 저장소 밖에 있어 다른 작업 환경(예: 이 컴퓨터의 다른 로컬 클론 경로)에서는 보이지 않기 때문이다.
- 이렇게 해야 그 서브프로젝트 폴더 하나만 복사/동기화해도 코드·DB 이력·문서가 전부 따라온다 (실제로 이 저장소는 로컬에 여러 클론이 존재할 수 있음 — 서브프로젝트 폴더가 자기완결적이어야 다른 클론으로 옮겨도 바로 이어서 작업 가능).

#### 새 자동화 서브프로젝트를 만들 때 반드시 지킬 것 (매번 적용)
- 코드/마이그레이션 SQL/README 정리를 전부 `<프로그램명>/` 폴더 안에서 진행했다면 그걸로 끝이
  아니다 — **커밋 대상으로 잡히는지 반드시 확인**한다: 사용자가 "커밋해줘"라고 하면
  `git add <프로그램명>/` 이후 `git status`로 그 폴더의 파일들이 실제로 스테이징됐는지 확인하고
  커밋 메시지에도 어떤 파일이 포함됐는지 알 수 있게 한다. "저장했다"는 보고와 "실제로 git에
  커밋·푸시됐다"는 별개이니 후자까지 확인 후 보고한다.
- 자동화 서브프로젝트마다 별도 Vercel 프로젝트로 `vercel deploy --prod`(CLI 업로드) 배포하는 게
  이 저장소의 표준 배포 방식이다 — Vercel 프로젝트가 GitHub과 Git 연동되어 있지 않은 것이 정상이며,
  Vercel 대시보드의 "Source/Git" 탭에 아무것도 안 보이는 것 자체는 문제가 아니다(2026-08-24
  실제로 여러 프로젝트를 `vercel inspect`로 비교해 신규/기존 서브프로젝트 모두 동일하게 Git
  미연동임을 확인함). 소스의 진위 여부는 Vercel이 아니라 **이 저장소(로컬 작업 폴더 + GitHub
  원격)** 가 기준이다.
- **"서브프로젝트 폴더에 작업 결과가 없다"는 보고를 받으면**, 실제로 누락된 것인지 먼저
  아래 순서로 직접 확인한 뒤 결과를 알린다(추측으로 답하지 않는다):
  1. `git status --porcelain -- <폴더>` — 커밋 안 된 변경사항이 있는지
  2. `git log --oneline -- <폴더>` — 로컬에 커밋 이력이 있는지
  3. `git log --oneline origin/master -- <폴더>` — **원격(GitHub)에도 반영됐는지**(로컬에만
     있고 push가 안 됐을 가능성을 반드시 별도로 확인)
  4. `git ls-files <폴더> | wc -l` — 실제로 git이 추적 중인 파일 개수
  이렇게 확인해서 실제로는 다 있는데도 사용자가 "없다"고 계속 보고한다면, 사용자가 보고 있는
  화면(GitHub 웹의 정확한 경로, 다른 로컬 클론, Vercel 대시보드 등)이 이 저장소·이 로컬 작업
  폴더와 다른 곳일 가능성이 높다 — 그 지점을 콕 집어 물어봐서 좁혀나간다.
- **2026-09-26 최근 작업 업데이트**:
  - `threads-affiliate-poster` 트렌드 페이지(/trends) 개편 — **2026-09-28 정정: 조회수·반응도 정렬·실시간 탐지는 지어낸 샘플 데이터였고 실제로 동작하지 않았다.** 지금은 Meta 공식 `keyword_search` API(앱 심사 전에는 본인 글만) + "떡상글 직접 가져오기" + 출처 배지로 재구현됨. 상세: `docs/PLATFORM_PATTERNS.md` §24.
  - 관리자 프롬프트 추천 페이지(`admin/prompts`) 카테고리 연동 및 `ai-image-studio` 3D/애니메이션 화풍 추가.
- **Electron 등 독립 실행형 데스크톱 앱 서브프로젝트를 추가하면 루트 `.vercelignore`에도
  등록할 것.** 루트 AIMaster 앱을 `vercel deploy`할 때 Vercel CLI가 `.gitignore`를
  존중하지 않고 로컬 작업 폴더 전체를 스캔한다 — 데스크톱 앱의 `runtime/`처럼 실행 중인
  프로세스가 파일을 잠그고 있으면(예: 열려 있는 Playwright 브라우저 프로필) `EBUSY`로
  루트 앱 배포 자체가 실패한다(2026-09-20, `naver-blog-auto-poster/runtime/browser-profiles`
  에서 실제 발견 — 2026-09-21 폴더 분리 후 경로는 `naver-blog-auto-poster_app/runtime`).
  그 서브프로젝트가 루트 앱에서 import되지 않는 게 확실하면(`grep`으로
  `app/` 안에서 그 폴더명을 참조하는 곳이 없는지 확인) 폴더 전체를, 최소한 `runtime/`·
  `node_modules/`는 반드시 `.vercelignore`에 추가한다.

### 멀티테넌시 원칙 (필독 — 모든 서브 자동화 프로그램에 적용)
**모든 서브 자동화 프로그램(threads, blog, 및 앞으로 추가되는 모든 프로그램)은 개발자 전용 도구가 아니라, AIMaster에 가입하고 해당 프로그램의 이용 권한(구독/개별부여/등급)을 가진 모든 회원이 각자 자신의 계정으로 동일하게 사용할 수 있는 멀티테넌트 서비스여야 한다.** 새 프로그램을 추가하거나 기존 프로그램을 수정할 때는 아래 5가지를 항상 지킬 것.

1. **로그인 ≠ 이용 권한. (필수 준수 — 예외 없음)** 페이지/레이아웃뿐 아니라 **실제로 쓰기 작업을 수행하는 모든 API route와 모든 Server Action("use server" 함수)은 하나도 빠짐없이** "로그인했는가"만이 아니라 "이 프로그램(`programs.slug`)에 대한 구독/개별부여/등급 권한이 있는가"까지 확인해야 한다. 페이지/레이아웃만 막고 실제 쓰기 함수는 `requireUser()`(로그인만 확인)로 남겨두면, 로그인한 비구독자가 그 화면을 그대로 우회해서(폼 직접 호출 등) 기능을 무료로 쓸 수 있다.
   - **판단 기준**: DB에 insert/update/upsert/delete 하는 함수, 유료 외부 API(OpenAI/Gemini/Perplexity 등)를 호출하는 함수, OAuth 연동/해제처럼 실제 부수효과를 일으키는 함수는 전부 대상이다. 로그인/로그아웃 액션(`signInAction`/`signOutAction`)만 예외 — 세션이 생기기 전에 실행되므로 프로그램 권한 검사 자체가 성립하지 않는다.
   - 페이지/레이아웃(서버 컴포넌트) + Server Action에서는 `requireProgramAccess()` 스타일(권한 없으면 `redirect()`)을 쓴다.
   - API route handler(특히 OAuth 콜백처럼 GET이지만 DB에 쓰는 라우트 포함)에서는 절대 `redirect()`를 쓰지 말고, `{allowed, error, status}` 형태의 결과 객체를 반환하는 버전(`checkProgramAccess()` / `checkProgramAccessApi()`)을 써서 JSON 에러 응답을 내려준다 (redirect를 fetch로 받으면 클라이언트의 `res.json()` 파싱이 깨진다). CRON_SECRET으로 보호되는 시스템 간 라우트(예: `dispatch-scheduled`)는 예외.
   - 새 서브프로젝트를 만들 때 `src/lib/access.ts`에는 `requireProgramAccess()`와 **`checkProgramAccessApi()`를 처음부터 같이 만든다** (나중에 API route/OAuth 콜백을 추가할 때 빠뜨리기 쉽다).
   - 참고 구현: `lib/access/checkProgramAccess.ts`(루트), `threads/src/lib/access.ts`, `shots/src/lib/access.ts`, `real_estate_sales/src/lib/access.ts`, `ai-auto-blog/utils/access.ts`(`requireProgramAccess` + `checkProgramAccessApi`).
   - **감사 이력**: 2026-08-06 blog의 `/api/auto-post`, `/api/posts/[id]` PUT/DELETE에서 발견·수정. 2026-08-10 전수 감사에서 threads(Server Action 17개 + Threads OAuth 콜백), shots(Server Action 30개 + Instagram/YouTube OAuth 콜백 2개), real_estate_sales(Server Action 6개)에서 전부 `requireUser()`만 쓰고 있던 것을 발견해 `requireProgramAccess()`/`checkProgramAccessApi()`로 일괄 수정함 — **거의 모든 신규 코드에서 반복되는 실수이니 새 Server Action/API route를 작성할 때마다 이 항목을 의식적으로 체크할 것.**
   - **`requireProgramAccess()`/`checkProgramAccessApi()`를 넣는 것만으로 끝이 아니다 — 그 파일에 `export const dynamic = "force-dynamic";`과 `export const fetchCache = "force-no-store";` 두 줄을 반드시 같이 선언할 것.** 이 둘 중 하나라도 빠지면 Vercel이 이 권한 체크 자체의 실행 결과를 정적으로 캐싱해서, 실제 로그인/권한 상태와 무관하게 과거 응답(다른 사람이 로그인했을 때, 혹은 빌드 시점)을 모든 사용자에게 그대로 서빙할 수 있다. 로컬 `npm run build`의 ○(Static)/ƒ(Dynamic) 표시는 이 버그를 잡아내지 못하니 신뢰하지 말 것 — 배포 후 `curl -s -D - -o /dev/null <live-url>`로 `X-Vercel-Cache` 헤더가 `MISS`인지 직접 확인해야 확실하다. 상세 배경과 재현 사례는 `docs/PLATFORM_PATTERNS.md` §10 참고.
     - **감사 이력**: 2026-08-30, bugang530@gmail.com의 blog 접근 권한 오류를 조사하다 blog의 write 레이아웃/API 라우트 9개에서 이 두 줄이 빠진 것을 발견. "모든 사용자·앞으로 가입할 사용자에게도 적용되도록" 나머지 17개 서브프로젝트 전체를 감사해 총 31개 파일(`(dashboard)/layout.tsx` 16개 + OAuth 콜백 등 `route.ts` 15개)에서 동일하게 발견해 일괄 수정함 — **새 서브프로젝트를 만들 때 `layout.tsx`/`route.ts`를 작성하는 즉시(나중이 아니라) 이 두 줄을 습관적으로 넣을 것.**
2. **사용자별 데이터는 완전히 격리한다.** 사용자 소유 데이터가 들어가는 테이블(게시글, 연결 계정, API 키 등)은 반드시 `user_id` 컬럼 + RLS owner-only 정책(`auth.uid() = user_id`)을 가진다. `createServiceClient()`/admin client(서비스 롤, RLS 우회)를 쓸 때는 코드에서 반드시 `user_id`로 직접 필터링해서 다른 사용자 데이터가 섞이지 않게 한다.
3. **API 키는 반드시 사용자 본인 키만 사용한다 — 관리자/앱 공용 키로 절대 폴백하지 않는다.** (2026-08-12부터 정책 변경 — 이전엔 "본인 키 → 없으면 앱 기본 키 폴백" 방식이었으나, 관리자 개인 API 키 비용을 다른 사용자가 무제한으로 쓰게 되는 문제가 있어 폐지함.) 공용 `user_api_keys` 테이블 구조와 `resolveApiKey()` 함수 이름은 그대로 재사용하되, 폴백 로직 없이 본인 키가 없으면 반드시 `null`을 반환해야 한다. 새 프로그램마다 이 테이블/함수를 다시 만들지 않는다.
   - 호출부(AI 생성/수집 액션 등)는 `resolveApiKey()`가 `null`을 반환하면 **조용히 실패시키지 말고**, 프론트엔드에 "API 키 등록이 필요합니다" 팝업(모달)을 띄워 설정 페이지로 안내해야 한다 (참고 구현: `insta_auto_poster/src/components/settings/ApiKeyRequiredModal.tsx`). 서버 액션의 에러 메시지도 "OpenAI API 키가 없습니다. 설정 페이지에서 본인 키를 등록해주세요." 처럼 등록 위치를 명시한다.
   - 각 프로그램의 `.env.local`/Vercel 환경변수에 등록하는 `OPENAI_API_KEY`/`GEMINI_API_KEY` 등은 더 이상 폴백용으로 쓰지 않는다 — AI SDK 등 다른 용도가 없다면 아예 등록하지 않는 것을 권장한다.
4. **외부 서비스 연동(OAuth 등)은 사용자별로 저장한다.** threads의 `threads_accounts`처럼 `user_id`에 unique 제약을 걸고, OAuth `state` 파라미터에 `user.id`를 실어 콜백에서 세션 사용자와 일치하는지 검증한다 (다른 사용자 명의로 계정이 연결되는 것을 방지).
5. **새 프로그램 체크리스트**: (1) `programs` 테이블에 slug 등록 시 **반드시 `app_url`(`https://<프로그램slug>.vercel.app` 형태)을 세트로 함께 등록**한다. 메인 관리자 화면(`/admin/programs`)과 사용자 카탈로그에서 프로그램명 우측의 외부 링크(`↗`)를 누르면 해당 실제 서브프로그램 라이브 사이트가 새 창(`target="_blank"`)으로 즉시 열리도록 `<a>` 태그로 보장되어야 하며, `app_url`을 빠뜨리거나 단순 장식용 `<span>`으로 회귀시켜서는 안 된다. (2) 대시보드 레이아웃에 `requireProgramAccess()` 게이트 (3) 모든 쓰기 API에 entitlement 체크 (4) 사용자별 데이터 테이블에 `user_id` + RLS (5) 외부 계정 연동은 사용자별로 저장 (6) API 키는 공용 `user_api_keys` 구조를 재사용하되 폴백 없이 본인 키만 허용하고, 미등록 시 등록 안내 팝업을 띄운다 (7) **(2)의 레이아웃과 (3)의 모든 API route에 `dynamic = "force-dynamic"` + `fetchCache = "force-no-store"` 두 줄을 반드시 같이 넣는다** — 위 1번 항목의 캐싱 버그 참고. (8) API 키 등록/외부 계정 연동 설정 페이지를 만들 때는 아래 "API키등록·플랫폼연동 페이지 표준" 섹션을 그대로 따른다(메뉴명 통일 + 하단 연동 매뉴얼 박스). (9) **서브프로그램 좌측 사이드바 상단에는 반드시 `← 다른 프로그램 보기` 링크를 배치하고, 대상 URL은 항상 전체 마케팅 자동화 프로그램 카탈로그 페이지인 `https://www.buylife.xyz/programs`로 고정 연결한다**(`/dashboard`나 상대경로 연결 금지, `docs/SIDEBAR_LAYOUT_STANDARD.md` 및 `docs/PLATFORM_PATTERNS.md` §32 준수).

### API키등록·플랫폼연동 페이지 표준 (모든 서브프로젝트 공통, 2026-09-13부터 필수)
서브프로젝트가 API 키를 등록하거나 외부 플랫폼 계정을 연동하는 설정 화면을 만들 때는 예외 없이
아래 두 가지를 지킨다 — naver-cafe-poster의 `src/app/(dashboard)/settings/page.tsx`가 기준
구현이다.
1. **사이드바/메뉴 라벨은 반드시 "API키등록·플랫폼연동"으로 통일한다.** threads-affiliate-poster가
   먼저 쓰던 이름이고, 2026-09-13에 naver-cafe-poster도 이 이름으로 맞췄다(예전엔 "네이버
   연동·카페 등록"처럼 프로그램마다 제각각이었음) — 새 프로그램도, 기존 프로그램의 이 메뉴를
   고칠 일이 생겨도 이 이름을 그대로 쓴다.
2. **그 설정 페이지 맨 하단에 "📖 연동 매뉴얼" 박스를 반드시 추가한다.** 이 프로그램이 실제로
   쓰는 API/플랫폼(OpenAI, Gemini, Perplexity, 각 SNS 등) 각각에 대해, 루트 AIMaster의
   `platform_guides` 테이블(관리 화면: `/admin/guides`, 공개 상세 페이지: `/guides/[id]`)에
   등록된 매뉴얼 게시글로 연결되는 버튼을 배치한다. 클릭하면 `window.open(url, "platform-guide-popup",
   "width=720,height=860,scrollbars=yes,resizable=yes")` 형태의 **팝업창**으로 열리게 해서(전체
   탭 이동이 아니라) 설정 화면 옆에 두고 그대로 따라 할 수 있게 한다 — 참고 구현:
   `naver-cafe-poster/src/components/settings/GuideLinkButton.tsx`.
   - 이 프로그램에 맞는 매뉴얼이 `platform_guides`에 아직 없으면(카테고리 포함) 먼저
     `/admin/guides`에 해당 카테고리·게시글을 등록한 뒤 그 `id`를 연결한다(네이버 카페
     자동화 때 category="네이버"로 새로 추가한 사례 참고). 이미 존재하는 카테고리(LLM AI/SNS/
     이커머스/메신저 | 알림/이미지 | 음악 | 나레이션/구글 워크스페이스 연동/정보수집 |
     웹스크랩핑)에 맞는 게시글이 이미 있으면 새로 만들지 않고 그 `id`를 그대로 재사용한다.
   - 회원이 API 키를 직접 발급받을 필요가 없는 연동(예: 공유 앱을 통한 "계정 연결하기" OAuth
     버튼 한 번으로 끝나는 방식)은 매뉴얼 대상에서 제외해도 되지만, 그 대신 club_id/menu_id
     찾기처럼 회원이 직접 알아내야 하는 값이 있다면 그 절차를 설명하는 매뉴얼은 반드시 추가한다.
6. **루트 AIMaster 앱(서브프로젝트 폴더가 아닌 `app/` 최상위)에서 "이 사용자가 이 프로그램을
   이용할 수 있는가"를 판정해야 하는 화면은, 절대 화면마다 구독/개별부여/등급 비교 로직을 새로
   작성하지 않고 반드시 `lib/access/checkProgramAccess.ts`를 그대로 재사용한다.**
   - 단일 프로그램 판정(예: 프로그램 상세 페이지, 서브프로젝트 임베드 진입 화면)에는
     `checkProgramAccess(supabase, userId, programSlug)`를 쓴다.
   - 여러 프로그램을 한 번에 판정해야 하는 화면(예: "내 구독" 대시보드처럼 프로그램 목록을
     순회하며 접근 가능 여부를 계산하는 경우)은 이미 가져온 데이터로 DB 재조회 없이 판정만
     하는 순수 함수 `evaluateProgramAccess()`를 쓴다.
   - 이 6번은 위 1번(서브프로젝트 폴더 안에서 그 서브프로젝트 자신이 "로그인한 사용자가 이
     프로그램을 쓸 수 있는지" 판단하는 `requireProgramAccess()`/`checkProgramAccessApi()`)과는
     대상이 다르다 — 1번은 서브프로젝트 내부용, 6번은 **루트 앱이 프로그램 접근 가능 여부를
     판정해야 하는 모든 지점**(신규 프로그램의 소개/상세 페이지, 대시보드의 "이용 가능한
     프로그램" 목록, 루트에 서브프로젝트를 직접 import해서 렌더링하는 임베드 페이지 등)에 적용된다.
   - **감사 이력**: 2026-09-03, a01039390116 계정이 "일반 등급으로 바꿨는데도 블로그 접근이 안
     된다"고 신고 → 조사 결과 `app/(main)/programs/[slug]/page.tsx`, `app/(dashboard)/dashboard/
     page.tsx`, `app/(main)/blog/page.tsx` 세 화면이 전부 이 판정 로직을 각자 새로 작성해서 써온
     것이 원인이었음(그중 `blog/page.tsx`는 구독·등급 체크 자체가 통째로 빠져 있었고,
     `programs/[slug]`는 구독 여부를 아예 확인하지 않는 별도 버그도 있었음). "판정 규칙을 한
     함수로 모아둬도, 그 함수를 실제로 안 불러 쓰면 소용없다"는 교훈으로 세 화면 모두 공용
     함수로 교체해 재발을 막음 — **새 프로그램/새 화면을 만들 때 이 판정이 필요하면 반드시
     이 공용 함수부터 확인할 것, 절대 직접 새로 짜지 않는다.**

### 이용 권한 판정 정책 (2026-09-29 베타테스트 기간, 주인님 지시)
모든 판정 코드(루트 `lib/access/checkProgramAccess.ts`의 `evaluateProgramAccess()`, 각 서브프로젝트 `lib/access.ts`의
`requireProgramAccess()`/`checkProgramAccessApi()`)는 아래 순서를 똑같이 따른다.
1. 정지된 계정(`profiles.is_suspended`) → 차단
2. 관리자(`profiles.is_admin`) → 허용
3. **FREE 배지(`programs.badges`에 `free`) → 가입한 회원이면 등급과 무관하게 누구나 허용** (핵심 원칙 6번)
4. 결제한 구독(`subscriptions` status=active, 만료 전) → 허용
5. `programs.required_grade_id`가 비어 있으면 → 허용 (현재 운영 중인 프로그램은 전부 "일반"으로 지정돼 있어 해당 없음)
6. **회원 등급 ≥ 프로그램 최소 등급(일반 이상) 이면서, 관리자가 넣어준 사용기간(`user_program_access.expires_at`, 비우면 무기한)이 남아 있으면 → 허용**
7. 그 외 → 차단. **등급만으로는 열리지 않는다**(예전엔 "일반 이상이면 전부 허용" 예외가 있어 사용기간이 의미가 없었다).
- 사용기간은 관리자 회원 관리 화면의 "만료기간 설정"으로 넣는다(`app/api/admin/user-access`, service role로 기록).
- 새 서브프로젝트의 `lib/access.ts`도 이 순서로 만든다. `tarot`(타로)·`mbti-character`(캐릭코드)는 2026-09-30 주인님 결정으로
  FREE 배지를 달고 같은 규칙의 판정 코드로 바꿨다(가입만 하면 사용 — 동작은 예전과 같음). 미적용: `naver-blog-seo-studio`(Codex 작업 중).

### Route Groups
- `app/(main)/` — Public pages (Header + Footer layout), `dynamic = "force-dynamic"` required for Supabase calls
- `app/(dashboard)/` — Authenticated user pages (Sidebar layout)
- `app/(auth)/` — Login/Register pages; use Suspense wrapper for pages that use `useSearchParams()`
- `app/admin/` — Admin-only pages (AdminSidebar layout, `is_admin=true` required)
- `app/api/` — API routes (payment/affiliate)

### Design System
Dark luxury theme defined in `tailwind.config.ts` + `app/globals.css`:
- Background: `#0a0a0f`
- Gold gradient: `#d4af37` → `#f5c842` (CSS class: `gold-text`, Tailwind: `text-gold`)
- Glass cards: `glass-card` CSS class
- Utility: `cn()` from `lib/utils/cn.ts`

### Key UI Components (`components/ui/`)
- `GlassCard` — glassmorphism card, props: `hover`, `glow`
- `GoldButton` — variants: `gold` | `outline` | `ghost`, sizes: `sm` | `md` | `lg`
- `Badge` — variants: `new` | `best` | `hot` | `sale` | `coming` | `free` | `custom`
- `GoldGradientText` — gold gradient text, prop `as` for HTML tag
- `Modal` — accessible modal with backdrop

### Supabase
- Client (browser): `lib/supabase/client.ts` → `createClient()`
- Server (RSC/API): `lib/supabase/server.ts` → `async createClient()`, `createServiceClient()` (bypasses RLS)
- Types: `types/database.types.ts`

### Auth & Middleware
- `middleware.ts` — protects `/dashboard`, `/affiliate`, `/settings` (auth), `/admin` (is_admin=true)
- Redirects unauthenticated users to `/login?redirect=<path>`
- Sets `affiliate_ref` cookie (30 days) from `?ref=` query param

### Environment Variables (`.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
PAYAPP_MEMBER_ID=
PAYAPP_SECRET_KEY=
NEXT_PUBLIC_APP_URL=
```

### DB Tables (11개 — Supabase SQL 스키마는 plan 파일 참조)
`member_grades`, `profiles`, `categories`, `programs`, `pricing_plans`, `grade_program_access`, `subscriptions`, `payment_records`, `affiliate_rates`, `affiliate_earnings`, `settlement_requests`

### Billing Types
`monthly` (30일) | `bimonthly` (60일) | `quarterly` (90일) | `biannual` (180일) | `annual` (365일) | `lifetime` (null expires_at)

새 프로그램 등록 시 기본 요금제(`components/admin/ProgramForm.tsx`의 `DEFAULT_PLANS`)는
2026-09-07부터 `monthly`/`bimonthly`/`quarterly`(1·2·3개월, 1만/2만/3만원) 3단계 구성이다
(사용자 지시로 기존 1/6/12개월+평생 4단계 기본값을 대체함). `biannual`/`annual`/`lifetime`은
여전히 선택 가능한 billing_type이며, 개별 프로그램에서 필요하면 수동으로 추가할 수 있다.

### Payapp 결제 흐름
`POST /api/payment/initiate` → 페이앱 URL 생성 → `payment_records (pending)` → 팝업
`POST /api/payment/webhook` → 서명검증 → `payment_records (completed)` → `subscriptions` 생성 → 어필리에이트 수수료 계산 → "00" 응답

---

## ★ 최상위 규칙의 예외 조항 (2026-10-09 주인님 지시)

**무료 키·무료 공용 키는 운영자가 등록한 키를 모든 회원이 함께 써도 된다.** 최상위 절대 규칙("본인 계정·본인 API 키")의 유일한 일반 예외이며, 아래 조건을 **모두** 만족할 때만 적용한다.

1. **비용이 들지 않는 키**: 무료 제공 키(정부·공공 공개 데이터 API 등)이거나 무료 공용 키라서, 회원이 아무리 써도 운영자에게 요금이 청구되지 않는다. **단, 무료여도 계정(키)당 호출 한도가 있어서 회원이 한 키로 몰리면 금방 한도(리밋)에 걸려 서비스가 멈출 수 있는 키는 예외가 아니다 — 그런 키는 회원 각자가 본인 키를 발급해 등록한다**(2026-10-09 주인님 추가 지시. 예: 네이버 검색·데이터랩 API는 무료지만 계정당 일일 한도가 있어 회원 본인 키를 쓴다). 과금될 수 있는 키(OpenAI·Claude·Gemini·Perplexity·Suno·JSON2Video·Replicate 등 유료 AI/미디어 키, 유료 한도를 넘기면 과금되는 키)는 **예외가 아니다** — 회원 본인 키만 쓴다.
2. **회원 개인의 계정·권한·개인 데이터와 무관한 것**: 공개 시장·공공 데이터 조회처럼 누가 불러도 같은 결과인 용도에 한정한다. 회원 본인의 외부 계정 연동(OAuth: Threads·Instagram·YouTube·Kakao·Naver 로그인 등), 게시·발행·메시지 발송처럼 회원 이름으로 행동하는 기능은 무료 키여도 **예외가 아니다** — 회원 본인 앱·계정으로만 한다.
3. **운영자 키는 코드·문서·저장소에 넣지 않는다**: 서버 환경변수로만 두고(비밀 키 노출 금지 원칙 유지), 키가 없거나 한도가 소진돼도 다른 회원의 키·유료 키로 대신 처리하지 않는다.
4. **적용 사실을 기록한다**: 이 예외로 운영자 키를 쓰는 프로그램과 키 이름은 [`docs/TOP_RULE_PERSONAL_ACCOUNT_API.md`](docs/TOP_RULE_PERSONAL_ACCOUNT_API.md) §8에 적는다(현재: `real_estate_sales`의 서울열린데이터·공공데이터포털·브이월드 키).

예외 조건에 해당하는지 애매하면 **본인 키 방식**으로 만들고 주인님께 먼저 확인한다.
