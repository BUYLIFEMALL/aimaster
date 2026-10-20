# 개발 플랜 — 병합 B: INSTA DM답변 자동화 → INSTA 댓글자동화 안으로 = 「INSTA 댓글·DM 자동화」 (2026-10-20, Claude Code 윈도우)

근거: `docs/analysis-insta-consolidation-20261020/REPORT.md` 병합 B. 주인님 결정: 이름 「INSTA 댓글·DM 자동화」, 순서 A(완료) → B.
기준 앱: **`instagram-comment-reply`**(slug·도메인 `instagram-comment-reply.buylife.xyz` 유지, 프로그램 이름만 변경). DM 앱 `instagram-dm-reply`는 3단계에서 화면 이동·API 전달 후 노출 중지.

## 조사 결과
- 두 앱 모두 Next(App Router, 루트 `app/`·`lib/`·`components/`), v1.17 / v1.16. 같은 경로 파일 55개 중 19개 내용 동일.
- 화면: 댓글 `/dashboard /media /comments /history /settings /guide`, DM `/dashboard /conversations /history /settings /guide` → 겹침 `/dashboard /history /settings /guide`.
- API 겹침: `/api/instagram/callback`(회원 Meta 앱에 등록된 OAuth 콜백), `/api/telegram/webhook/[userId]`(텔레그램 봇 웹훅), `/api/cron/check-connection`, `/api/telegram/migrate-webhooks`. DM 전용: `/api/instagram/dm-webhook/[userId]`(회원 Meta 앱에 등록하는 DM 웹훅).
- 보안값: OAuth state·텔레그램 웹훅 비밀값·Meta 웹훅 검증값이 각 프로젝트 `CRON_SECRET`에서 파생 → 두 프로젝트 값이 다를 수 있음(값은 열어 보지 않음). 환경변수 이름은 두 프로젝트가 같음.
- 연결 계정 표: 댓글 `ig_accounts`, DM `dm_accounts`(각 2행 — **관리자·시험 계정만**). 텔레그램 `user_telegram_links`(program_slug별, 이 두 프로그램은 관리자 1명씩·서로 다른 봇).
- 이용 권한: 두 프로그램 모두 234명, **완전히 같은 회원** → 권한 이전 불필요. 구독 0. Vercel 자동 실행(crons)은 두 앱 모두 일부러 꺼 둔 상태(실사용 검수 전).

## 결정(플랜 기본값)
1. **인스타 연결 한 번**: 설정에서 연결할 때 「DM 답변도 사용」 선택(기본 켬)을 두고, 켜면 댓글 권한 + 메시지 권한을 함께 요청, 끄면 지금처럼 댓글 권한만(회원 Meta 앱에 메시지 권한이 없을 때 연결이 실패하지 않게). 연결 결과는 `ig_accounts`와(DM 사용 시) `dm_accounts`에 같은 토큰으로 저장 → DM 기능 코드는 그대로 `dm_accounts`를 읽음. 콜백은 댓글 앱 기존 주소(회원 Meta 앱에 이미 등록된 주소) 그대로.
2. **DM 웹훅·텔레그램 주소**: 합친 앱에서 DM 텔레그램 웹훅은 `/api/dm/telegram/webhook/[userId]`(댓글 텔레그램과 분리, 회원별 DM 봇 연결 그대로 `program_slug=instagram-dm-reply` 행 사용), Meta DM 웹훅은 `/api/instagram/dm-webhook/[userId]` 그대로. 비밀값은 합친 앱 `CRON_SECRET` 기준 → **기존 DM 연결(관리자 텔레그램 DM 봇 1개, 관리자·시험 Meta DM 웹훅)은 합친 뒤 한 번 다시 등록**(실제 회원 영향 없음). 환경변수 추가·변경 없음.
3. **권한·요금**: 이용 권한은 `instagram-comment-reply` 기준(두 프로그램 같은 234명). 요금 그대로.

## 단계
### 1단계 — DM 화면·기능 이식 (댓글 앱 v1.18)
- 화면: DM `conversations` → `/dm/conversations`, DM 기록 → `/dm/history`, DM 설정(답장 방식·자동 응답·고지문 등) → `/dm/settings`, DM 매뉴얼 → `/dm/guide`. 좌측 메뉴에 「💬 DM 답변」 묶음.
- 코드: DM 전용 lib는 `lib/dm/`(이미 있는 `lib/dm` 그대로)와 `lib/dmApp/`(DM 쪽 다른 공통 파일), 컴포넌트 `components/dm/`. 공용 사본(`memberIntegrations` 등)은 기준 그대로.
- API: `/api/instagram/dm-webhook/[userId]`, `/api/dm/telegram/webhook/[userId]`, DM 전용 server action 이식.
- 연결: 설정 화면 「DM 답변도 사용」 선택 + 콜백에서 `dm_accounts` 함께 저장.
- 검수: tsc·build·기존 테스트 → 배포 → 크롬(관리자) DM 화면·설정·연결 상태, 실제 DM 발송은 하지 않음.
### 2단계 — 대시보드·기록 하나로 (v1.19)
- 대시보드에 댓글·DM 대기 수 함께, 기록 화면 탭(댓글/DM), 텔레그램 연결 안내 정리.
### 3단계 — 옛 DM 정리 (주인님 확인 후)
- `instagram-dm-reply.buylife.xyz` 화면 → 합친 앱 `/dm/...`, `/api/*` → 합친 앱 전달(`/api/instagram/callback` → DM 콜백 처리, `/api/telegram/webhook/*` → `/api/dm/telegram/webhook/*`). 카탈로그 DM 「병합됨」·노출 중지, 댓글 앱 이름 「INSTA 댓글·DM 자동화」·소개 다시 쓰기, 역량 지도. Vercel 프로젝트·도메인 삭제 안 함.

## 비용
- 유료 API 없음(AI 답글 생성 시험 생략, 실제 DM·댓글 게시 없음). Vercel 빌드 단계마다 1회.

## 위험
- 회원 Meta 앱에 메시지 권한이 없으면 「DM 답변도 사용」 연결이 실패 → 화면에서 끄고 다시 연결하도록 안내 문구.
- DM 웹훅·텔레그램 DM 봇 재등록 필요(관리자·시험 계정만 해당).

## 진행 결과 (2026-10-20)
- 1단계 v1.18 완료, 텔레그램 연동 수정 v1.19~v1.22, 2단계 v1.23 완료(대시보드·기록 탭·이름 통일).
- 3단계 완료(주인님 승인): 옛 DM 앱 v1.17 화면 이동·API 전달, 카탈로그 DM 노출 중지, 이름·소개 다시 씀, 메인 상세 주소 이동, 역량 지도. 관리자 텔레그램 DM 봇·Meta DM 웹훅은 합친 앱 기준으로 재등록 완료.
