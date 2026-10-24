# 네이버 자동화 완성 기준

> **상태: 초안(2026-10-24, 작성 claude-win-dotori [역할: analysis-planning]) — 담당 세션 확인 전.** 「네이버」 카테고리 전담 역할이 아직 없다. 담당 세션이 확인·수정하기 전까지는 참고 자료로만 쓴다. 이 문서 작성으로 운영 코드·DB·권한·배포는 바뀌지 않았다.

- 적용 범위: ① AIMaster 운영(DB ref `esgxyikcnnvmlhygjkth`)의 「네이버」 카테고리 — 운영 `naver-cafe-poster`(네이버 카페 포스팅 자동화, 코드 v1.28), 관리자 전용 비공개 `naver-blog-auto-poster`(폴더 `naver-blog-auto-poster_app`, v1.12)·`naver-blog-auto-poster-web`(폴더 `naver-blog-auto-poster_web`, v1.13). 앞으로 만드는 네이버 카페·네이버 로그인·네이버 공식 API 기반 프로그램에도 적용한다.
- **네이버 블로그 글쓰기 프로그램은 「블로그」 카테고리 소관이다.** 블로그 원고·이미지·확장 자동 포스팅은 [블로그·티스토리 자동화 완성 기준](BLOG_AUTOMATION_COMPLETION_POLICY.md)·[블로그 기능 상세 비교표](BLOG_FEATURE_MATRIX.md)·[블로그 통합 작업표](BLOG_CONSOLIDATION_TASKS.md)를 따른다. 이 문서는 비공개 블로그 두 앱의 「공개·병합 결정 전 보존 상태」만 다룬다.
- 관계 문서: [네이버 기능 상세 비교표](NAVER_FEATURE_MATRIX.md) · [네이버 통합 작업표](NAVER_CONSOLIDATION_TASKS.md) · [네이버 편집기 자동 입력 지침](NAVER_BLOG_EDITOR_AUTOMATION_GUIDE.md) · [PLATFORM_PATTERNS §20 봇 탐지 회피](PLATFORM_PATTERNS.md) · [공용 네이버 엔진 제안](SHARED_NAVER_ENGINE_PROPOSAL_2026-10-10.md) · [회원 연동 5단계 플랜](PLAN_20261020_MEMBER_INTEGRATIONS_STEP5_YT_KAKAO_NAVER.md) · [예약 기능 지침](SCHEDULER_POLICY.md) · [회원 본인 계정·키 최상위 규칙](TOP_RULE_PERSONAL_ACCOUNT_API.md) · [카테고리 지침 지도](CATEGORY_GUIDE_MAP.md).

## 1. 완성 흐름 (목표)

네이버 카페 자동화의 완성 목표는 아래 흐름이 **회원 본인 네이버 앱·본인 계정·본인 AI 키로 끊기지 않고** 이어지는 것이다.

**회원 본인 네이버 앱 등록(Client ID/Secret) → 네이버 로그인 연결 → 카페 `club_id`·게시판 `menu_id` 등록 → 글감 수집(URL·RSS·Perplexity) → AI 초안(당해 연도 기준) → 회원 확인·수정 → 회원이 고른 방식으로 게시(초안만 / 즉시 / 예약) → 결과 기록(글 주소·실패 사유) → 30일 정리**

- 카페는 **네이버 공식 카페 글쓰기 API**(`POST /v1/cafe/{clubid}/menu/{menuid}/articles`)를 쓴다. 공식 API가 있으므로 화면 조작(브라우저 자동화)으로 바꾸지 않는다.
- 공식 API가 없는 네이버 서비스(블로그 글쓰기 등)를 자동화할 때만 브라우저 자동화를 쓰고, 그때는 [PLATFORM_PATTERNS §20](PLATFORM_PATTERNS.md)(봇 탐지 회피 최우선 — 한 글자씩 입력·사람 속도·실측 선택자)과 [네이버 편집기 자동 입력 지침](NAVER_BLOG_EDITOR_AUTOMATION_GUIDE.md)을 처음부터 적용한다.
- 카페 오픈API에는 **글 수정·삭제 엔드포인트가 없다**(`naver-cafe-poster/src/lib/actions/posts.ts` `updateAndRepublishPostAction` 주석). 그래서 「다시 게시」는 항상 새 글이 하나 더 생긴다. 이것을 「중복 게시」와 구분해 회원에게 미리 알린다.

## 2. 「끝났다」고 말할 조건

아래를 모두 만족해야 그 기능·프로그램을 「완료」로 보고한다. 하나라도 빠지면 빠진 단계를 「미완료」·「미검수」로 적는다.

1. **회원 본인 앱·계정·키로 동작**: 네이버 로그인은 회원이 직접 만든 네이버 개발자센터 앱의 Client ID/Secret(`user_api_keys`의 `naver_client_id`·`naver_client_secret`)으로만 한다(기준: `naver-cafe-poster/src/lib/naver/account.ts` `resolveNaverAppCredentials`). 운영자 공용 네이버 앱·운영자 환경변수 키로 대신하지 않는다. AI 키(OpenAI·Gemini·Perplexity)·cron-job.org 키도 회원 본인 것만 쓰고, 없으면 실행하지 않고 등록 안내를 띄운다(`src/lib/apiKeys.ts` `resolveApiKey` — 폴백 없음).
2. **네이버 검색·데이터랩 키도 회원 본인 키**: 무료지만 계정당 하루 한도가 있으므로 운영자 공용 키 예외에 해당하지 않는다(루트 CLAUDE.md 「최상위 규칙의 예외 조항」 1번). 새 기능에서 검색·데이터랩·쇼핑 API가 필요하면 공용 `user_api_keys`·[회원 연동 정보](MEMBER_INTEGRATIONS.md)에 항목을 추가해 회원이 등록하게 한다.
3. **OAuth 콜백 검증**: `state`에 회원 `user.id`를 싣고 콜백에서 세션 회원과 같은지 확인하며, 콜백도 프로그램 이용 권한을 확인한다(기준: `src/app/api/naver/callback/route.ts` — `user.id !== state` 차단, `checkProgramAccessApi`, `dynamic`·`fetchCache` 두 줄).
4. **게시 결과 기록과 중복 방지**: 게시 결과(성공 시 카페 글 주소 `cafe_article_url`, 실패 시 `error_message`, 원본 응답 `raw_response`)를 회원 글 행에 남긴다(`src/lib/posts/publish-core.ts`). **결과가 불확실하면(시간 초과·게이트웨이 오류처럼 네이버에 글이 올라갔는지 모르는 경우) 자동으로 다시 게시하지 않는다** — 「결과 확인 필요」로 남기고 회원이 카페에서 확인한 뒤 직접 다시 누르게 한다(현재 미충족 — [작업표](NAVER_CONSOLIDATION_TASKS.md) 「우선 처리」 NV-P1·NV-P2).
5. **정기 실행 안전**: 실행 직전 프로그램 이용 권한 확인(`src/lib/programAccess.ts`, v1.22), 운영자·회원 호출이 겹쳐도 한 번만 실행(조건부 `last_run_at` 선점, `src/lib/scheduledSource/dispatch.ts`), 비밀값이 비어 있으면 401(`src/app/api/cron/generate-and-post/route.ts`).
6. **회원 데이터 격리·비공개·30일 정리**: 회원 글·글감·이미지·영상은 `user_id` + RLS 소유자 정책으로 격리하고(`supabase/0001_naver_cafe_poster.sql` 등), 생성 자료는 생성일 기준 30일 뒤 자동 삭제한다. 회원 업로드·생성 이미지는 비공개 버킷 + 서명 주소를 목표로 한다(현재 미충족 — 공개 버킷 `post-images`·30일 정리 없음, 작업표 NV-P3·NV-P4).
7. **당해 연도 기준 프롬프트**: 초안·글감 정리·수정 프롬프트에 `new Date().getFullYear()`로 현재 연도를 넣고 「과거 연도로 퇴행 금지」 지시를 포함한다(현재 미충족 — 작업표 NV-P5).
8. **검수 증거**: 로컬 검사(tsc·build) → 배포 Ready → 시험 계정(`buylifemall@naver.com`) 실제 화면 확인을 각각 기록한다. **실제 카페 게시는 회원 계정의 외부 공개 행동이므로 주인님 승인 없이 하지 않는다**(v1.21 검수처럼 차례가 오지 않게 만든 시험 데이터로 확인). 누르지 않은 버튼은 「미검수」로 적는다.
9. **문서 갱신**: 같은 작업에서 [네이버 기능 상세 비교표](NAVER_FEATURE_MATRIX.md) 칸·변경 이력, 프로그램 `AGENTS.md`·`docs/IMPROVEMENTS.md`, [프로그램 비교표](PROGRAM_CAPABILITY_MAP.md) 카드·버전을 고친다.

## 3. 회원이 고르는 게시 방식 (필수 3가지)

회원이 고르지 않은 방식으로 게시하지 않는다. 세 방식 중 빠진 것이 있으면 완성 보고에 「미구현」으로 밝힌다.

| 방식 | 뜻 | 네이버 카페 현재 구현 | 근거 |
|---|---|---|---|
| ⓐ 입력만(초안만) | 글을 만들어 저장만 하고 게시는 회원이 직접 누름 | ○ 정기 소스 「자동 게시」 끔 → `status='draft'`로 저장, `/drafts`에서 검수 후 게시 | `src/lib/scheduledSource/engine.ts` `runScheduledSource`(`auto_post` 분기), `src/app/(dashboard)/drafts/page.tsx` |
| ⓑ 즉시 게시 | 회원이 누른 순간 카페에 게시 | ○ 초안 「게시」 버튼 | `src/lib/actions/posts.ts` `deployDraftAction`·`saveAndDeployDraftAction` |
| ⓒ 예약 게시 | 회원이 정한 때에 자동 게시 | △ **주기형만**(정기 소스: 주기마다 새 글 생성 + 자동 게시). **특정 글을 특정 시각에 게시하는 시각 지정 예약은 없음**(`ncafe_posts`에 예약 시각 칸 없음, `supabase/0001_naver_cafe_poster.sql`) | `src/lib/scheduledSource/dispatch.ts`, `src/lib/schedule.ts` `isScheduleDue`, `vercel.json`(5분) |

- 계정 기본값(정기 소스의 `auto_post` 스위치)은 소스별로 회원이 켜고 끈다. 회원이 켜지 않은 소스는 자동 게시하지 않는다.
- 예약 실행 방식(AIMaster 기본 Vercel / 회원 본인 cron-job.org)은 회원이 설정 화면에서 고른다(`src/components/settings/SchedulerModePicker.tsx`, [SCHEDULER_POLICY](SCHEDULER_POLICY.md)).
- 네이버 블로그 쪽(비공개 두 앱)은 **발행 버튼을 항상 회원이 직접 누른다** — ⓐ에 해당하고 ⓑ·ⓒ는 없다(`naver-blog-auto-poster_app/src/lib/naverBlogAutomation.js` 71~160줄 주석). 공개 전환·병합 시 [블로그 최우선 핵심 지침](../CLAUDE.md)의 세 방식 선택을 블로그 담당이 다시 판단한다.

## 4. 하지 않을 것

- **운영자·다른 회원의 네이버 앱·계정·키로 대신 처리하지 않는다.** 운영자 공용 네이버 앱은 검수 전 테스터 계정만 로그인되므로 다른 회원은 연결 자체가 안 된다(2026-09-16 전환 사유, `src/lib/naver/client.ts` 머리 주석).
- **결과가 불확실한 게시를 자동으로 다시 보내지 않는다.** 카페 API에는 삭제가 없어 중복 글을 회원이 손으로 지워야 한다.
- **도배·차단 회피·대량 전송 최적화 기능을 만들지 않는다.** 여러 부계정을 돌려 쓰는 「계정 로테이션」은 카페 운영 규칙 위반·제재 위험이 크므로 주인님 판단 전에는 만들지 않는다(`naver-cafe-poster/docs/IMPROVEMENTS.md` 1-2 제안은 보류 대상).
- **이미지·영상 링크를 본문 HTML 태그로 넣지 않는다.** 이 API는 `<br>` 외 태그(속성 있는 `<a>`, `<img>`)가 섞이면 403으로 거부한 실측 기록이 있다 — 이미지는 `image[0]` 파일 파트, 링크는 순수 텍스트 URL(`src/lib/posts/publish-core.ts` 주석).
- **공식 API가 있는 서비스를 화면 조작으로 바꾸지 않는다.** 공식 API가 없는 경우에만 §20을 지켜 브라우저 자동화를 쓴다.
- **회원 확인 없이 외부에 게시하지 않는다.** 정기 소스의 자동 게시는 회원이 그 소스에서 스위치를 켠 경우뿐이다.
- 이미지 생성 프롬프트를 다른 프로그램과 공유·복사하지 않는다. 공용 사본(`src/lib/ai/geminiImage.ts`·`nanoBananaModels.ts`·`memberScheduler.ts`·`memberIntegrations.ts`)은 직접 고치지 않고 기준을 고친 뒤 `node scripts/check-shared-modules.mjs --sync`.

## 5. 회원 본인 키 규칙 (네이버 적용)

| 키·연동 | 저장 위치 | 쓰는 곳 |
|---|---|---|
| 네이버 Client ID/Secret(회원 앱) | `user_api_keys` `naver_client_id`·`naver_client_secret` | 로그인·토큰 갱신(`src/lib/naver/account.ts`) |
| 네이버 로그인 연결(토큰) | `ncafe_accounts` + 공용 `member_platform_accounts`(platform `naver_login`, v1.24) | 게시·예약 게시(`src/lib/naver/memberAccount.ts` `getNaverAccount`) |
| OpenAI | `user_api_keys` `openai` | 초안·글감 정리(`src/lib/ai/cafeGenerator.ts`, `collector.ts` `structureCafeCandidates`) |
| Perplexity | `user_api_keys` `perplexity` | 트렌드 글감(`collector.ts` `searchPerplexityTrending`) |
| Gemini | `user_api_keys` `gemini` | 대표 이미지(`src/lib/actions/ai.ts` `generateCafeImageAction`) |
| cron-job.org | `user_api_keys` `cronjob_org_api_key` | 회원 예약 실행(`src/lib/scheduledSource/cronJobOrg.ts`) |
| NewsBlur(RSS) | 앱 공용 표 `newsblur_accounts`(회원별 행) | RSS 글감(`src/lib/actions/newsblurAccount.ts`) — 비밀번호 저장 방식은 확인 필요(작업표 NV-Q2) |

- 새 네이버 프로그램이 네이버 로그인을 쓰면 `member_platform_accounts`의 `naver_login` 연결을 재사용하되, **공용 계정의 앱(`app_ref`)이 그 회원이 지금 등록한 Client ID와 같을 때만** 쓴다(v1.24 규칙).
- 설정 화면 메뉴 이름은 「API키등록·플랫폼연동」, 맨 아래 「📖 연동 매뉴얼」 팝업 버튼을 둔다 — **네이버 카페가 이 표준의 기준 구현이다**(`src/app/(dashboard)/settings/page.tsx`, `src/components/settings/GuideLinkButton.tsx`).

## 6. 한국인 인물 묘사·당해 연도

- 대표 이미지 프롬프트에 사람이 나오면 기본 한국인(동아시아인)으로 묘사한다 — 현재 구현됨(`src/lib/ai/imageGenerator.ts` 48·95줄).
- 글 프롬프트는 당해 연도를 동적으로 주입한다 — **현재 `naver-cafe-poster/src/lib/ai/`와 비공개 두 앱의 `web/lib/naverBlogAutoPoster/`에 `getFullYear` 주입이 없다**(2026-10-24 검색).

## 7. 완성 보고 양식(네이버)

완성 보고에는 아래를 따로 적는다: 게시 방식 3종(ⓐ초안만·ⓑ즉시·ⓒ예약 주기형/시각 지정)별 구현·검수 상태 / 실제 카페 게시 여부(승인 여부) / 결과 불확실 시 자동 재게시 여부 / 회원 본인 네이버 앱·키 확인 / 비공개 저장·30일 정리 영향 / 당해 연도 주입 / 정기 실행 방식(Vercel·cron-job.org) 확인 / 비용 리포트(빌드·AI 호출·누구 키).
