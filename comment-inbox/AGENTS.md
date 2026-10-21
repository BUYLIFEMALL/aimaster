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
4. **현재 버전·변경 히스토리** — **v1.08**(2026-10-22) 그날 목록에 상대가 남긴 원래 댓글·DM 앞부분(💬)과 보낸 답장(↪)을 함께, 그래프+목록을 공용 기준 코드 `week-reply-panel`로 / v1.07(2026-10-22) 7일 그래프를 플랫폼별 색(인스타 댓글·DM·쓰레드·유튜브)으로 쌓고, 막대를 누르면 그날 게시·발송한 목록(작성자·답장 앞부분, 누르면 원래 프로그램 묶음) / v1.06(2026-10-21) 「📊 최근 7일 응대」 막대그래프(한국 시간 날짜별 게시·발송 건수, 「오늘 답함」과 같은 기준, 앞 3일과 뒤 3일 비교 한 줄) / v1.05(2026-10-21) 머리 카드 「오늘 답함」(한국 시간 오늘 0시 이후 게시·발송, 권한 있는 플랫폼, 건너뛰기 제외·플랫폼별 내역은 마우스 올림) / v1.04(2026-10-21) 건너뛰기 후 5초 「되돌리기」(본인 skipped 항목만 검토 대기로) / v1.03(2026-10-21) 「?」 단축키 도움말 창, 휴대폰에서 접힌 카드를 왼쪽으로 100px 넘게 밀면 건너뛰기 / v1.02(2026-10-21) 처리 후 다음 항목 자동 펼침·키보드 단축키(J/K·↑↓ 이동, Enter 펼치기, A 승인(펼친 항목만, 아니면 먼저 펼침), S 건너뛰기, 입력칸 Ctrl+Enter 승인·Esc 빠져나오기), 게시 묶음 사본에 이중 게시 방지(처리 중 선점) 반영 / v1.01 신규: 1단계(모아 보기·이동) + 2단계(바로 승인·게시).
5. **남은 작업·백로그** — [`docs/IMPROVEMENT_BACKLOG.md`](docs/IMPROVEMENT_BACKLOG.md)
6. **연계·병합 아이디어** — 카카오 채널 댓글 등 다른 「검토 후 게시」 프로그램을 같은 방식(게시 묶음 공용 사본)으로 추가, 원래 프로그램 대시보드에 「받은편지함에서 한 번에 보기」 링크.
7. **UI/UX 개선안** — 여러 항목 한 번에 승인(실제 공개 게시라 사전 승인 필요), 플랫폼별 색 구분 강화, 그날 목록 항목에서 바로 다시 답글 달기.

## ⚠️ 꼭 지킬 것

- **게시 묶음을 고치면 `node scripts/check-shared-modules.mjs --sync`가 이 폴더의 사본을 바꾸는 순간 시험을 자동으로 돌리고, 실패하면 「문제」로 보고한다(2026-10-21). 직접 돌릴 때는 `cd comment-inbox && npm test` 또는 원래 프로그램 폴더에서 `npm run test:reply-post`, 점검 스크립트 `--test`.** 기존 설명: — 공용 게시 함수 4개(사본)를 가짜 DB·가짜 플랫폼으로 돌리는 이중 게시 방지 시험 26개(`tests/double-post.test.mjs`, 추가 패키지 없음, Node 24 내장). 원래 프로그램의 기준 파일을 고친 뒤 `--sync` 하고 여기서 시험. 게시 함수가 새 모듈을 가져오면 `tests/fakes/loader.mjs`에 가짜를 추가해야 시험이 돈다.
- **새 응대 채널 붙이는 법**(2026-10-21 조사: 지금 「검토 대기 → 승인 게시」 흐름이 있는 프로그램은 이 세 댓글 프로그램뿐, 카카오(`kakao_auto_poster`)는 뉴스레터 발송이고 카카오 채널은 고객 대화 읽기·답장 공개 API가 없어 대상 아님): ① 원래 프로그램이 `status='pending_review'`·`generated_reply`·`replied_at`·`user_id` 표를 갖고, 게시 함수(`post.ts`)가 같은 `replied_at` 선점을 쓰게 한다 ② 게시 묶음(post·memberAccount·client·token)을 `scripts/check-shared-modules.mjs`에 등록하고 사본을 이 폴더에 `--sync` ③ `lib/inbox/load.ts`의 `SOURCE_PROGRAMS`·`PLATFORM_*`·조회 묶음, `lib/actions/inbox.ts`의 `TABLE`·승인 분기, 카드 칩·좌측 메뉴 필터에 추가 ④ `types/database.types.ts`에 표 형식 추가 ⑤ `tests/double-post.test.mjs`의 `PLATFORMS`에 한 줄 추가.

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

### 2026-10-21 v1.02 — 단축키·자동 펼침 + 이중 게시 방지 반영 (Claude Code 윈도우)
- `components/inbox/InboxList.tsx`(새): 포커스·펼침 관리, 처리(승인·건너뛰기) 성공 → `router.refresh()` 뒤 같은 자리(다음 항목) 자동 펼침·스크롤, 키보드 J/K·↑↓·Enter·A·S(입력칸에서는 꺼짐). `InboxItemCard`를 제어형(`open`·`focused`·`onDone`) + `forwardRef` 동작(approve·skip)으로. A는 펼친 항목만 승인(펼치지 않았으면 먼저 펼침 — 내용을 보지 않고 공개 게시하지 않게). 입력칸 Ctrl+Enter 승인, Esc 빠져나오기.
- 게시 묶음 사본 4개에 원래 프로그램과 같은 이중 게시 방지(`replied_at` 선점) 반영(`--sync`).
- 검수: tsc·build, 배포 `comment-inbox-n1t1i5bku` READY, DB v1.02, 크롬 `/inbox` v1.02. 대기 0건이라 단축키·자동 펼침은 실제 항목으로 미확인. 비용: Vercel 빌드 1회. 커밋 `77d2b9c8`.

### 2026-10-21 v1.03 — 단축키 도움말·밀어서 건너뛰기 + 이중 게시 방지 자동 시험 (Claude Code 윈도우)
- 자동 시험(`tests/`, `npm test`): 게시 함수 사본 4개 × (동시 승인 시 호출 1번·실패 후 재시도·2분 넘은 표시 재처리·방금 표시 거절·이미 게시 거절·다른 회원 거절) + DM 2가지(안내 문구 없음 → 표시 해제·첫 답장 안내 1번+답장 1번) = 26개 통과. 이중 게시 방지 이전 버전으로 바꿔 돌리면 「동시 승인」·「방금 표시」 2개가 실패하는 것으로 시험이 문제를 실제로 잡는지 확인(확인 후 복원).
- 화면: `InboxList` 「?」(또는 「? 단축키 전체」 버튼) 도움말 창·Esc 닫기, 휴대폰 안내 줄. `InboxItemCard` 접힌 카드 터치 밀기(세로 스크롤과 구분, 100px 넘게 밀면 건너뛰기, 뒤에 「놓으면 건너뛰기」 표시).
- 검수: tsc·시험 26·build, 배포 `comment-inbox-99fpzgush` READY, DB v1.03, 크롬 `/inbox` v1.03. 대기 0건이라 도움말 창·밀기는 실제 항목으로 미확인. 비용: Vercel 빌드 1회. 커밋 `f3127568`(시험)·`74720335`(화면).
- **사고 기록**: 시험 커밋 `f3127568`에 다른 세션이 미리 스테이징한 `lyric-video-studio`·`playlist-channel-studio` 썸네일 추천 파일 6개가 함께 들어가 푸시됨(내용 그대로, 강제 푸시 안 함, 세 세션에 메시지로 안내). 이후 「스테이징 목록이 내 경로뿐일 때만 커밋」 확인 장치로 커밋.

### 2026-10-21 v1.04 — 건너뛰기 되돌리기 + 시험 자동 실행 연결 (Claude Code 윈도우)
- `lib/actions/inbox.ts` `unskipInboxItemAction`: 권한 두 겹 확인 후 본인·`status='skipped'` 행만 `pending_review`로(게시된 항목은 건드리지 않음). `InboxList`: 건너뛰기 성공 → 아래쪽 「⏭ 건너뛰었어요 — 작성자 · ↩ 되돌리기」 5초. 마지막 항목을 건너뛰어도 알림이 남도록 빈 상태 카드도 `InboxList`가 그림(화면에서 `empty`로 넘김) — 덤으로 빈 상태에서도 「?」 도움말이 열림.
- 시험 자동 실행: `scripts/check-shared-modules.mjs`가 `comment-inbox/lib/` 사본을 `--sync`로 바꾸면 `npm test`를 돌려 실패 시 `FAIL 시험:` + 문제 1건(종료 코드 1), `--test`로 강제 실행. 원래 프로그램 3곳 `package.json`에 `test:reply-post`. 검증: 쓰레드 기준 게시 함수를 이중 게시 방지 이전 버전으로 바꿔 `--sync` → 시험 자동 실행·2개 실패 보고 → 복원 후 26개 통과(파일 내용 변경 없음).
- 검수: tsc·시험 26·build, 배포 `comment-inbox-jqxr8h9vh` READY, DB v1.04, 크롬에서 「?」 도움말 창 열림(표 8줄)·Esc 닫힘 실제 확인. 되돌리기 알림은 대기 0건이라 실제 항목으로 미확인. 비용: Vercel 빌드 1회. 커밋 `3fd312c2`(시험 연결)·`df825e8f`(되돌리기).
- 네이버 블로그·카페 「댓글 응대」: 해당 기능이 아직 없어 작업 없음 — 생기면 위 「새 응대 채널 붙이는 법」대로.

### 2026-10-21 v1.05 — 오늘 답한 건수 + 서버 동작 시험 + 텔레그램 링크 연계 (Claude Code 윈도우)
- `lib/inbox/load.ts` `kstTodayStartIso`·`loadTodayReplied`(서비스 롤 count, user_id·status=posted·replied_at ≥ 한국 시간 오늘 0시). 건너뛴 항목은 처리 시각이 없어 세지 않음. 화면 머리 카드 「오늘 답함」.
- 시험 37개(`npm test`): 게시 함수 26 + 서버 동작 10(승인 권한 거절·플랫폼 4종 게시·동시 승인 1회·빈 내용/모르는 플랫폼 거절·건너뛰기 대상 제한·다른 회원·권한 / 되돌리기 skipped만·다른 회원·권한) + 한국 시간 기준 시각 1. `tests/fakes/app.mjs`(로그인·권한·DB·next/cache·react cache 가짜), 데이터 파일 `load.ts`는 진짜로 읽음. 되돌리기에서 「skipped만」 조건을 빼면 시험이 실패함을 확인 후 복원.
- 연계: 원래 댓글 프로그램 3곳 텔레그램 승인 알림에 「📥 통합 받은편지함에서 보기」(`/inbox?p=…`) — INSTA v1.33·쓰레드 v1.22·유튜브 v1.27.
- 검수: tsc·시험·build, 배포 `comment-inbox-43kctrpls` READY, DB v1.05, 크롬 「오늘 답함 0」·내역(4플랫폼 0). 비용: Vercel 빌드 1회(받은편지함) + 3회(원래 프로그램). 커밋 `784bc931`(시험)·`1b981b91`(오늘 건수)·`802e89c8`(텔레그램).

### 2026-10-21 v1.06 — 최근 7일 응대 막대그래프 (Claude Code 윈도우)
- `lib/inbox/load.ts` `bucketByKstDay`(순수 함수: 한국 시간 날짜별 7칸, 범위 밖 버림)·`loadWeekReplied`(권한 있는 플랫폼 표마다 user_id·status=posted·replied_at ≥ 한국 시간 6일 전 0시, 최대 5,000건). `components/inbox/WeekChart.tsx`(그림 라이브러리 없이 CSS 막대, 오늘 분홍 강조, 합계·흐름 한 줄, aria-label). 머리 카드 아래에 표시.
- 시험 38개(`npm test`, 날짜 나누기 1개 추가 — 0시 경계·범위 밖 확인).
- 검수: tsc·시험·build, 배포 `comment-inbox-lqkrpt4l5` READY, DB v1.06, 크롬에서 v1.06·카드·날짜 10/15~10/21(오늘) 확인, 400px 가로 넘침 없음. 기록 0건이라 높이 있는 막대는 실제 데이터로 미확인. 비용: Vercel 빌드 1회. 커밋 `50227294`.
- 같은 날: 주인님 승인으로 관리자 INSTA 댓글 봇에 링크 버튼 시험 메시지 1건 발송(텔레그램 응답 성공·메시지 번호 5·링크 버튼 1개 붙음, 승인 버튼은 넣지 않음). 앱 화면에서 보이는지는 주인님 확인 대기.

### 2026-10-22 v1.07 — 7일 그래프 플랫폼별 쌓기 · 막대 누르면 그날 답한 목록 · 그래프를 공용 기준 코드로 (Claude Code 윈도우)
- 새 공용 기준 코드(이 프로그램이 기준): `lib/weekChart/bucket.ts`(`week-reply-bucket` — `kstTodayStartIso`·`kstDayRange`·`weekStartIso`·`bucketByKstDay`, 항목에 묶음 이름 `series`를 주면 `bySeries`로 셈), `components/weekChart/WeekReplyChart.tsx`(`week-reply-chart` — 클라이언트 컴포넌트, 테두리 카드는 부르는 쪽이 감싸고 글자색은 물려받음, 묶음 2개 이상이면 색으로 쌓고 범례, `onSelect`를 주면 막대가 버튼). 사본은 세 댓글 프로그램 대시보드. `lib/inbox/load.ts`는 위 함수를 다시 내보냄(시험 경로 그대로).
- `components/inbox/WeekPanel.tsx`(받은편지함 전용): 카드 칩과 같은 색, 막대 누르면 서버 동작 `loadDayRepliedAction` → `loadDayReplied`(받은편지함 권한 + 원래 프로그램 권한 있는 플랫폼만, user_id·status=posted·한국 시간 그날 범위, 플랫폼마다 최근 50건, 답장은 `generated_reply` 앞 80자). 날짜 형식이 아니거나 7일 밖이면 빈 목록. 빠르게 다른 막대를 누르면 늦게 온 이전 응답은 버림. 옛 `components/inbox/WeekChart.tsx` 삭제.
- 시험 40개(`npm test`, 쌓기·하루 범위·잘못된 날짜 2개 추가). 시험 연결 장치 `tests/fakes/loader.mjs`에 `@/lib/weekChart/bucket` 등록.
- 검수: tsc·시험·build, 커밋 `1b91c98f`, 배포 `comment-inbox-hn6evggjp` READY, DB v1.07, 크롬에서 v1.07·막대 7개 버튼·오늘 막대 누르면 선택 표시와 「10/22(목) 답한 목록 0건 · 이날은 게시·발송한 답장이 없어요」(서버 왕복 확인), 400px 가로 넘침 없음(385=385). **기록 0건이라 쌓인 막대·목록 항목 모양은 실제 데이터로 미확인.** 비용: Vercel 빌드 1회.

### 2026-10-22 v1.08 — 그날 목록에 원래 댓글 · 그래프+목록을 공용 기준 코드 `week-reply-panel`로 (Claude Code 윈도우)
- 새 공용 기준 코드(이 프로그램이 기준): `components/weekChart/WeekReplyPanel.tsx` — 그래프 + 막대 누르면 그날 목록(💬 원래 댓글, ↪ 보낸 답장, 한국 시간 시각, 외부 주소는 새 창). 목록을 불러오는 서버 동작(`loadDay`)과 테마 색(`classes`)은 부르는 쪽이 넘김. `lib/weekChart/bucket.ts`에 `weekDayRange`(최근 7일 안 날짜만 하루 범위)·`previewText`(앞 80자) 추가. `WeekReplyChart`에 흐름 문장 말 `noun`(기본 「응대」) 추가.
- `lib/inbox/load.ts` `loadDayReplied`가 원래 댓글(`comment_text`)·DM(`message_text`)도 읽음. `components/inbox/WeekPanel.tsx`는 공용 패널을 부르는 얇은 묶음으로.
- 시험 42개(`npm test`): 그날 목록(본인·게시된 항목만, 원래 댓글·DM 이름, 최근 것부터)·공용 도움 함수 시험 추가. 가짜 DB에 `gte`·`lt`·`in`·`order`·`limit` 추가.
- 검수: tsc·시험·build, 커밋 `472abe68`, 배포 `comment-inbox-3u3pu8b29` READY, DB v1.08, 크롬에서 v1.08·오늘 막대 누르면 「이날은 게시·발송한 답장이 없어요」 확인. 기록 0건이라 목록 항목 모양은 실제 데이터로 미확인. 비용: Vercel 빌드 1회.
- 같은 날 `noun` 추가(커밋 `10835a02`)는 기준 파일만 바뀌고 동작 같음 — **받은편지함·세 댓글 프로그램은 다음 배포 때 함께 나감**.

### 2026-10-22 미배포 공용 변경 안내
- **미배포 공용 변경 안내(2026-10-22, Claude Code 윈도우) — 다음에 이 프로그램을 배포할 때 버전 +0.01과 함께 나감**: 공용 기준 코드 사본 `components/weekChart/WeekReplyChart.tsx`(흐름 문장 `noun`·막대 안내 `selectHint`·숨겨진 막대 설명 중립화)·`WeekReplyPanel.tsx`(문구 `labels`·작성자 선택·썸네일 `thumbUrl`과 안 열리면 숨김)·`lib/weekChart/bucket.ts`(`publicImageUrl`) — 이 프로그램은 기준 파일이라 다음 배포 때 v1.09로이 저장소에서 바뀌었지만 이 프로그램 화면·동작은 같다(기본값 그대로). 사본은 직접 고치지 말고 기준을 고친 뒤 `node scripts/check-shared-modules.mjs --sync`. 배포 뒤 이 줄을 「배포됨(버전)」으로 바꾼다. 목록: 루트 `docs/SHARED_MODULES.md`.
