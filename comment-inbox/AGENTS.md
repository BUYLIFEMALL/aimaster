# 🤖 AI 댓글·DM 통합 받은편지함 (`comment-inbox`) — 에이전트 작업 지침

루트 `../CLAUDE.md`(메인 지침)를 함께 읽는다. 개발 플랜: [`docs/PLAN_20261021_UNIFIED_COMMENT_INBOX.md`](docs/PLAN_20261021_UNIFIED_COMMENT_INBOX.md)

https://comment-inbox.buylife.xyz

## 📌 7대 핵심 항목 (v1.01)

1. **사용 목적·대상** — 인스타·쓰레드·유튜브를 함께 운영하는 회원이 세 댓글 프로그램(INSTA 댓글·DM 자동화·쓰레드 댓글 자동화·유튜브 댓글 자동화)을 따로 열지 않고, 검토 대기 댓글·DM을 **한 화면에서 급한 순서로** 보고 **고쳐서 바로 승인**한다.
2. **기술 스택·스킬** — Next.js 14.2.35 App Router · TypeScript · Tailwind v3(`ig-*` 다크 토큰, INSTA 댓글·DM과 같은 팔레트) · Supabase 공용 DB(`@supabase/ssr`, 서비스 롤 읽기 + `user_id` 필터) · `react` `cache`(레이아웃·화면 한 번 읽기) · 공용 기준 코드 사본(`scripts/check-shared-modules.mjs`).
3. **핵심 기능·구조·장단점**
   - 데이터: `lib/inbox/load.ts` — `loadSourceAccess`(원래 프로그램 3개 권한, `lib/programAccess.ts` 판정: 정지 → 관리자 → 핸드폰 → FREE → 구독 → 등급+사용기간) → `loadInbox`(권한 있는 플랫폼만 `ig_comments`·`dm_messages`(+`dm_conversations` 24시간 창)·`th_comments`(+`th_posts`)·`ytreply_comments`(+`ytreply_videos`) 검토 대기, 플랫폼당 100건). 정렬: 답장 창 남은 DM(남은 시간 적은 순) → 댓글(오래된 순) → 창 지난 DM.
   - 화면: `/inbox`(필터 `?p=ig_dm|ig_comment|threads|youtube`, `components/inbox/InboxItemCard.tsx` — 플랫폼 칩·DM 남은 시간·썸네일·「답장 쓰기」·승인·건너뛰기·원래 프로그램 링크 `#media-`/`#conv-`/`#post-`/`#video-`), `/guide`(매뉴얼), 좌측 메뉴(플랫폼별 건수, 휴대폰 ☰), 로그인·회원가입, 공지 띠.
   - 승인: `lib/actions/inbox.ts` — 받은편지함 권한 + **그 플랫폼 원래 프로그램 권한**을 둘 다 확인한 뒤 원래 프로그램과 같은 게시 함수 사본 호출(`lib/comments/instagramPost.ts`·`threadsPost.ts`·`youtubePost.ts`·`lib/dmApp/dm/post.ts`). 건너뛰기는 `pending_review`인 본인 행만 `skipped`.
   - 장점: 창 전환 없이 응대, 급한 순, 원래 프로그램·텔레그램과 상태 공유(이중 게시 없음), 별도 키 등록 없음. 단점: 새 댓글 수집·AI 초안은 원래 프로그램이 해야 나타남, 플랫폼당 100건, 실제 공개 게시 실검수 전.
4. **현재 버전·변경 히스토리** — **v1.01**(2026-10-21) 신규: 1단계(모아 보기·이동) + 2단계(받은편지함에서 바로 승인·게시).
5. **남은 작업·백로그** — [`docs/IMPROVEMENT_BACKLOG.md`](docs/IMPROVEMENT_BACKLOG.md)
6. **연계·병합 아이디어** — 카카오 채널 댓글 등 다른 「검토 후 게시」 프로그램을 같은 방식(게시 묶음 공용 사본)으로 추가, 원래 프로그램 대시보드에 「받은편지함에서 한 번에 보기」 링크.
7. **UI/UX 개선안** — 여러 항목 한 번에 승인(실제 공개 게시라 사전 승인 필요), 키보드 단축키(J/K 이동·A 승인), 처리 후 다음 항목 자동 펼침.

## ⚠️ 꼭 지킬 것

- **게시 묶음은 사본이다 — 직접 고치지 않는다.** 아래 파일은 원래 프로그램의 기준 파일 사본이며 기준만 고친 뒤 `node scripts/check-shared-modules.mjs --sync`:
  - INSTA 댓글: `lib/comments/instagramPost.ts`(← `instagram-comment-reply/lib/comments/post.ts`), `lib/instagram/{memberAccount,client,token}.ts`
  - INSTA DM: `lib/dmApp/dm/post.ts`, `lib/dmApp/instagram/{memberAccount,client,token}.ts`
  - 쓰레드: `lib/comments/threadsPost.ts`(← `threads-comment-reply/lib/comments/post.ts`), `lib/threads/{memberAccount,client,token}.ts`
  - 유튜브: `lib/comments/youtubePost.ts`(← `youtube-auto-reply/lib/comments/post.ts`), `lib/youtube/{memberAccount,client,token}.ts`, `lib/apiKeys.ts`·`lib/apiKeyLabels.ts`
  - 공통: `lib/memberIntegrations.ts`(기준 루트), `components/ProgramNoticeBanner.tsx`(기준 ai-webtoon-studio)
- `types/database.types.ts`는 세 프로그램 형식을 합친 것(표 18개). 원래 프로그램 표에 칸이 생기면 함께 맞춘다. `ApiKeyProvider`는 유튜브와 같게(키 이름표 사본과 일치해야 함).
- 원래 프로그램 권한 확인을 빼지 않는다(받은편지함이 유료 댓글 프로그램 우회 통로가 됨).
- 실제 공개 게시 시험은 주인님 승인 후. 시험 계정에 대기 항목이 생겼을 때 1건씩.
- Vercel 프로젝트는 CLI(`vercel project add`)로 만들어 프레임워크가 비어 있었음 → `vercel.json`에 `"framework": "nextjs"`(지우지 말 것).

## 작업 기록

### 2026-10-21 v1.01 — 신규 (Claude Code 윈도우)
- 주인님 결정: 새 프로그램 · 이름 「AI 댓글·DM 통합 받은편지함」(`comment-inbox`) · 2단계까지. 사전 승인: 새 Vercel 프로젝트 환경변수 복사, 원래 프로그램 토큰 코드 정리·재배포.
- 원래 프로그램 정리(동작 같음): 토큰 갱신 함수를 `"use server"` 연결 파일에서 `token.ts`로 이동 — INSTA v1.31·쓰레드 v1.20·유튜브 v1.25 배포(로그인 200·연결 점검 401 확인). 그 뒤 게시 묶음 17개 파일을 공용 기준 코드로 등록·사본 생성.
- DB(운영 `esgxyikcnnvmlhygjkth`): `programs` 등록(카테고리 마케팅(홍보), 최소 등급 일반, `app_url`, 상세 소개·특징·순서·대상), 기본 요금제 3단계, VIP 등급 연결 → VIP 142명 자동 부여(시험 계정 포함). 썸네일: 상위 이미지 모델 2회(1회차 글자·브랜드 로고가 그려져 재생성) — 기록 `supabase/migrations/20261021_register_comment_inbox.sql`.
- Vercel: 프로젝트 `comment-inbox`(팀 buylife), 환경변수 4개(Supabase 주소·공개 키·서버 키·메인 사이트 주소, 운영·미리보기), 도메인 `comment-inbox.buylife.xyz`. 첫 배포는 프레임워크 미지정으로 실패 → `vercel.json` 수정 후 `comment-inbox-d253c54tm` READY. 새 도메인 인증서가 퍼지는 몇 분 동안 간헐적 SSL 실패 후 안정.
- 검수: tsc·build, 크롬(관리자 계정으로 로그인돼 있던 상태) `/inbox`·필터·`/guide` 정상, 400px 가로 넘침 없음·☰. 대기 0건이라 카드·승인 흐름은 실제 데이터로 미확인. **실제 공개 게시 미실행.**
- 비용: Vercel 빌드 원래 프로그램 3회 + 받은편지함 2회(1회 실패), 이미지 생성 2회.
