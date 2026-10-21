# AI 댓글·DM 통합 받은편지함 (`comment-inbox`) — 개발 플랜

- 작성: 2026-10-21 Claude Code(윈도우) · 대상: ① AIMaster 운영(DB `esgxyikcnnvmlhygjkth`)
- 근거 아이디어: [`PROGRAM_IDEA_BACKLOG.md`](PROGRAM_IDEA_BACKLOG.md) IDEA-INBOX-01
- **주인님 결정(2026-10-21)**: 위치 = 새 프로그램 · 이름 = 「AI 댓글·DM 통합 받은편지함」(`comment-inbox`) · 범위 = **2단계까지**(받은편지함에서 바로 승인·게시)

## 1. 문제

인스타 댓글·DM, 쓰레드 댓글, 유튜브 댓글을 응대하려면 프로그램 3개(`instagram-comment-reply`·`threads-comment-reply`·`youtube-auto-reply`)에 따로 들어가야 한다. 급한 DM(24시간 답장 창)과 오래된 댓글을 한눈에 비교할 수 없다.

## 2. 이미 있는 것 (재사용)

| 재사용 | 내용 |
|---|---|
| 화면 부품 | 공용 기준 코드 `pending-review-list`·`hash-highlight`·`review-group-header`(기준 `instagram-comment-reply/components/`) — 사본으로 받음 |
| 데이터 | `ig_comments`·`dm_messages`(+`dm_conversations`)·`th_comments`·`ytreply_comments` 모두 `user_id`·`status='pending_review'`·`generated_reply` |
| 연결 토큰 | `member_platform_accounts`(instagram·threads·youtube) + 각 프로그램 표 — 각 프로그램의 `memberAccount.ts`가 「공용 → 없으면 프로그램 표」 순서로 읽음 |
| 이중 게시 방지 | 게시 함수가 `posted`면 거부, 텔레그램 승인도 `pending_review`일 때만 → 받은편지함에서 승인하면 원래 프로그램·텔레그램에도 「게시됨」으로 반영 |
| 권한 판정 | 루트 `lib/access/checkProgramAccess.ts`(정지 → 관리자 → 핸드폰 → FREE → 구독 → 등급+사용기간) |

## 3. 핵심 설계

1. **새 독립 앱** `comment-inbox/`(Next 14.2.35 — INSTA 댓글·DM과 같은 뼈대), 주소 `https://comment-inbox.buylife.xyz`, 버전 `v1.01`.
2. **권한 2겹**: 받은편지함 자체는 `comment-inbox` 권한(`requireProgramAccess`). 그리고 **플랫폼마다 원래 프로그램 권한이 있는 회원에게만** 그 플랫폼 항목을 보여 주고 승인을 허용한다 — 받은편지함이 유료 댓글 프로그램을 우회하는 뒷문이 되지 않게.
3. **회원 본인 데이터만**: 서비스 롤로 읽되 항상 `user_id` 필터. 새 표·DB 구조 변경 없음.
4. **급한 순 정렬**: 답장 창이 남은 DM(남은 시간 적은 순) → 댓글(오래된 순) → 답장 창이 지난 DM.
5. **게시는 원래 프로그램과 같은 코드**: 게시 함수·계정 읽기·토큰 갱신·API 호출을 **공용 기준 코드로 등록하고 받은편지함에 사본**으로 넣는다(프로그램끼리 직접 호출 금지 원칙). 기준은 각 원래 프로그램.

## 4. 단계

### 1단계 — 모아 보기 + 원래 프로그램으로 이동
- 화면: `/inbox`(첫 화면) — 플랫폼 필터(전체·인스타 댓글·인스타 DM·쓰레드·유튜브), 항목은 공용 `PendingReviewList`(썸네일·DM 남은 시간 배지), 누르면 원래 프로그램 검토 화면 묶음(`#media-`·`#conv-`·`#post-`·`#video-`)으로 이동.
- `/guide`(사용 매뉴얼), 좌측 메뉴(휴대폰 ☰), 로그인, 공지 띠.

### 2단계 — 받은편지함에서 바로 승인·게시
- 항목을 펼치면 AI 초안 수정칸 + 「답변승인」·「건너뛰기」. 승인 = 원래 프로그램과 같은 게시 함수 사본 호출.
- **원래 프로그램 정리(동작 변경 없음)**: 지금 토큰 갱신 함수가 각 프로그램의 `"use server"` 연결 파일(`lib/actions/instagram.ts`·`threads.ts`·`youtube.ts`, INSTA DM `lib/dmApp/actions/instagram.ts`) 안에 OAuth·권한 코드와 섞여 있어 그대로 가져다 쓸 수 없다 → 토큰 갱신 부분만 `lib/<플랫폼>/token.ts`로 옮기고 기존 파일은 그 함수를 다시 내보낸다(호출하는 곳 수정 없음). 그 뒤 게시 묶음을 공용 기준 코드로 등록.
- 공용 등록 예정: 플랫폼별 `post.ts`·`memberAccount.ts`·`client.ts`·`token.ts`(INSTA 댓글·INSTA DM·쓰레드·유튜브) — 사본은 받은편지함 같은 경로.
- DM은 원래 규칙 그대로: 첫 답장 전 자동 응답 고지, 24시간 창.

## 5. 검수

- 자동: 각 앱 `tsc`·`npm run build`, `node scripts/check-shared-modules.mjs`(사본 일치).
- 화면(메인 크롬·일반 회원 `buylifemall@naver.com`): 로그인·권한·필터·이동·휴대폰 400px.
- 권한: 원래 프로그램 권한이 없는 플랫폼 항목이 안 보이는지, 남의 항목 id로 승인 요청 시 거부되는지.
- **실제 공개 게시 시험은 주인님 승인 후 1회씩**(시험 계정에 대기 항목이 생겼을 때). 승인 전에는 게시 버튼까지의 흐름과 거부 경로만 확인.

## 6. 비용

| 구분 | 내용 | 비고 |
|---|---|---|
| Vercel 빌드 | 받은편지함 배포 수 회 + 원래 프로그램 3개 각 1회(2단계 정리) | 실행 직전마다 보고 |
| 새 Vercel 프로젝트·도메인 | 프로젝트 1개(팀 요금 안), 와일드카드 도메인이라 DNS 추가 없음 | 환경변수는 기존 댓글 프로그램과 같은 값 복사 |
| 카탈로그 썸네일 | 이미지 1장(규칙상 상위 모델 허용, 수십 원 수준) | 실행 직전 보고 |
| AI 호출 | 없음(초안은 원래 프로그램이 이미 만든 것) | |
| 회원 부담 | 없음(플랫폼 게시 API 무료, 회원 본인 계정·토큰) | |

## 7. 등록·문서

- `programs` 등록(`app_url`·한 줄 요약·상세 설명·`detail_sections`, 기본 요금제 3단계, VIP 등급 자동 부여 확인), 역량 지도 카드, 공용 코드 등록부, 인수인계 6종, ACTIVE_WORK.
- 한 줄 요약 예시: 「인스타·쓰레드·유튜브 댓글과 DM을 한곳에 모아 급한 순서대로 바로 응대하는 통합 받은편지함」
