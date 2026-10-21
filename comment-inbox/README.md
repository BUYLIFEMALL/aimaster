# AI 댓글·DM 통합 받은편지함 (`comment-inbox`)

인스타 댓글·DM, 쓰레드 댓글, 유튜브 댓글의 검토 대기 항목을 한 화면에 모아 급한 순서로 보여 주고, AI 초안을 고쳐 바로 승인·게시하는 프로그램입니다.

https://comment-inbox.buylife.xyz

- 현재 버전: **v1.05** (2026-10-21 오늘 답한 건수 / 자동 시험 37개 `npm test`)
- 구조·핵심 항목 7가지·꼭 지킬 것: [`AGENTS.md`](AGENTS.md)
- 개발 플랜: [`docs/PLAN_20261021_UNIFIED_COMMENT_INBOX.md`](docs/PLAN_20261021_UNIFIED_COMMENT_INBOX.md)
- 개선 원장·백로그·디자인: [`docs/IMPROVEMENTS.md`](docs/IMPROVEMENTS.md) · [`docs/IMPROVEMENT_BACKLOG.md`](docs/IMPROVEMENT_BACKLOG.md) · [`docs/DESIGN_HANDOFF.md`](docs/DESIGN_HANDOFF.md)

## 왜 이렇게 만들었나

- **새 독립 프로그램**: 메인 사이트에는 프로그램 화면을 두지 않고, 프로그램끼리 서로 호출하지 않는 저장소 규칙 때문.
- **게시는 원래 프로그램과 같은 코드(공용 기준 코드 사본)**: 받은편지함에서 승인해도 원래 프로그램·텔레그램에 같은 상태가 반영되고 이중 게시가 없음.
- **권한 두 겹**: 받은편지함 권한 + 원래 댓글 프로그램 권한. 권한 없는 플랫폼은 보이지도 처리되지도 않음.
- **별도 키·연결 없음**: 원래 프로그램이 저장한 회원 본인 연결 토큰(`member_platform_accounts`·각 프로그램 표)을 그대로 사용.

## 환경변수

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`(또는 `..._PUBLISHABLE_KEY`), `SUPABASE_SERVICE_ROLE_KEY`(또는 `SUPABASE_SECRET_KEY`), `NEXT_PUBLIC_MAIN_SITE_URL`. 예약 실행(crons) 없음.

## 배포

`cd comment-inbox && vercel deploy --prod --yes --scope buylife` (프로젝트 `comment-inbox`, 도메인 `comment-inbox.buylife.xyz`).
