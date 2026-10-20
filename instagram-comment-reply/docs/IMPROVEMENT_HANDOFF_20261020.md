# 인수인계 — INSTA 댓글·DM 자동화 병합·정리 (2026-10-20, Claude Code 윈도우)

- 프로그램: `instagram-comment-reply` (slug 동일) · 현재 **v1.24** · 운영 DB `esgxyikcnnvmlhygjkth`
- 서비스: https://instagram-comment-reply.buylife.xyz
- 옛 DM 주소(이동만): https://instagram-dm-reply.buylife.xyz → 합친 앱 `/dm/...`
- 메인 상세: https://www.buylife.xyz/programs/instagram-comment-reply (옛 `/programs/instagram-dm-reply`는 이동)

## 1. 이번에 한 일 (시간 순)
| 버전 | 내용 | 커밋 |
|---|---|---|
| v1.18 | 병합 B 1단계 — DM 화면 5개(`/dm/*`)·DM 웹훅·DM 텔레그램·DM 전용 코드(`lib/dmApp/`·`components/dm/`)·DB 형식(`dm_*`) 이식, 인스타 연결 한 번(「DM 답변도 사용」) | `f9392323` |
| v1.19~v1.20 | 텔레그램 연동 실패 안내에 입력 토큰의 봇 이름, 텔레그램 칸에 「💬 댓글 전용 봇 / 💌 DM 전용 봇」 배지 | `26be9f7a` `3af22e14` |
| v1.21 | **텔레그램 연동 확인이 메시지를 못 찾던 원인 수정** — `getUpdates`에 `allowed_updates=["message"]` | `c970327f` |
| v1.22 | 연동 실패 안내 끝에 `[진단: 웹훅·대기 수·알림 종류]` (`telegramDiagnosis`) → 관리자 DM 봇 재연동 성공 | `6c10efeb` |
| v1.23 | 2단계 — 대시보드에 DM 대기·연결 상태, 기록 댓글/DM 탭(`components/HistoryTabs.tsx`), 옛 이름 10곳 통일 | `e95121e2` |
| (3단계) | 옛 DM 앱 v1.17 화면 이동·API 전달, 카탈로그 DM 노출 중지, 이름·소개·특징·순서·대상 다시 씀, 메인 상세 이동, 역량 지도 | `258d6b15` `a4c7ac9d` |
| v1.24 | 공지 띠, DM 설정 값 정리, 통합 초보자 매뉴얼(`/guide`), 플로우 위저드 스타일(다크) 템플릿 | `e4079f79` `d6f637d1` `7edf635b` `5c2a52a9` `bec7b45c` |

같은 세션의 다른 프로그램: threads-comment-reply v1.14~v1.15, youtube-auto-reply v1.19~v1.20, kakao-auto-posting v1.28~v1.29(텔레그램 수정·공지 띠), auto-instagram-posting v1.42(공지 띠), booking-reminder·crm-google-form·longtail-keyword-expander·real_estate_sales·trending-product-finder(텔레그램 수정 코드만, **다음 배포 때**).

## 2. 꼭 알아야 할 구조
- **연결 한 번**: `/settings` 「📸 Instagram 계정 연결」의 「DM 답변도 사용」(기본 켬) → 메시지 권한까지 요청 → 콜백(`app/api/instagram/callback`)이 `ig_accounts` + (권한 있으면) `dm_accounts` + 공용 `member_platform_accounts`에 저장. 해제는 둘 다 지움.
- **키는 한 곳**: Meta 앱 키·AI 키는 `/settings`에서만 등록(`user_api_keys`, 댓글·DM 공용). `/dm/settings`는 상태만 보여 줌.
- **DM 웹훅**: 회원 Meta 앱 Webhooks에 `https://instagram-comment-reply.buylife.xyz/api/instagram/dm-webhook/<회원 id>` + 확인 토큰(`computeInstagramVerifyToken`, 합친 앱 `CRON_SECRET` 기준) + `messages` 구독. POST 서명은 회원 `meta_app_secret`.
- **텔레그램 봇 2개**: 댓글 `program_slug=instagram-comment-reply`(`/api/telegram/webhook/[userId]`), DM `program_slug=instagram-dm-reply`(`/api/dm/telegram/webhook/[userId]`). 봇 하나에 웹훅 하나.
- **옛 DM 앱**(`instagram-dm-reply/next.config.mjs`): 화면 redirect, API rewrite(`/api/telegram/webhook/*`→`/api/dm/telegram/webhook/*` 등). Vercel 프로젝트·도메인은 지우지 않음.
- **디자인**: 색은 `tailwind.config.ts` `ig-*` 토큰만(다크). 직접 색 쓰지 말 것 — `docs/DESIGN_HANDOFF.md`.

## 3. 주의사항 (다음 CLI 필독, 상세 `docs/ERROR_LESSONS.md` 2026-10-20)
1. 텔레그램 `getUpdates`에는 받을 종류를 꼭 지정(`allowed_updates`) — 안 하면 웹훅을 걸었던 봇에서 메시지가 버려짐.
2. 앱을 합치면 `CRON_SECRET` 파생 비밀값이 바뀌므로 옛 앱 기준 등록(텔레그램·Meta 웹훅 확인 토큰)은 다시 등록.
3. 공용 부품을 넣을 때 `Database` 형식 정의 때문에 `never` 오류가 날 수 있음 → 기준 코드에서 형식 없는 조회.
4. 배포 직전 `docs/SHARED_MODULES.md` 「미배포 사본」과 각 프로그램 `AGENTS.md` 「(미배포)」 확인.
5. 공용 문서(HANDOFF·ACTIVE_WORK·PROGRAM_IDEA_BACKLOG)가 다른 CLI 때문에 미커밋이면 내 줄만 올린다(`git hash-object` + `update-index`).
6. 실제 DM 발송·댓글 게시는 회원 승인 없이 하지 않는다. 자동 게시·발송 기본값은 끔.

## 4. 확인한 것 / 못 한 것
- 확인: 각 단계 tsc·build, 배포 Ready, DB 버전, 크롬(대시보드·통합 매뉴얼·DM 설정·DM 기록·메인 상세), 390px iframe(좌측 메뉴 숨김·☰·가로 넘침 없음), 옛 주소 화면 7곳 307·API가 합친 앱 경로에서 처리(X-Matched-Path), 관리자 DM 텔레그램 봇 연동 완료 메시지 수신(주인님 확인).
- 못 한 것: **실제 고객 DM 왕복**(다른 계정 → 관리자 DM → 초안 → 텔레그램), 다크 전환 후 댓글 검토·DM 검토·로그인 화면 직접 열람, 휴대폰 실제 창 폭 조절(창 최대화라 iframe으로 대체).

## 5. 남은 일과 다음 첫 단계
1. (주인님 협조) 다른 인스타 계정에서 관리자 계정으로 DM 1건 → `/dm/conversations`·텔레그램 DM 봇에 초안이 오는지 확인. 발송은 하지 않음.
2. 크롬으로 `/comments`·`/dm/conversations`·`/login`을 열어 다크 배경 글자 대비 점검(직접 색 남은 곳 수정).
3. 텔레그램 수정 5개 프로그램·웹툰 공지 띠 보완은 각 프로그램 다음 배포 때.
4. 옛 `instagram-dm-reply/` 폴더의 앱 코드(전달 설정 외) 정리 시점은 주인님 결정 대기 — 지우지 않음.
5. 백로그: [`IMPROVEMENT_BACKLOG.md`](IMPROVEMENT_BACKLOG.md)

## 6. 관련 문서
- 플랜: [`PLAN_20261020_DM_MERGE.md`](PLAN_20261020_DM_MERGE.md) · [`PLAN_20261020_TEMPLATE_MANUAL.md`](PLAN_20261020_TEMPLATE_MANUAL.md)
- 병합 분석: `../../docs/analysis-insta-consolidation-20261020/REPORT.md` (DB 백업 `backup-programs-before-merge-b.json`)
- 디자인: [`DESIGN_HANDOFF.md`](DESIGN_HANDOFF.md) · 개선: [`IMPROVEMENTS.md`](IMPROVEMENTS.md)
- 세션 전체: `../../docs/HANDOFF_CLAUDE_SESSION_2026-10-20_INSTA.md`
