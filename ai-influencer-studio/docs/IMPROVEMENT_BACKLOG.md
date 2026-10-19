# AI 인플루언서 자동화 (`ai-influencer-studio`) — 작업 대기 백로그

## 인스타 자동 포스팅 (2026-10-19 주인님 지시 — 작업 대기)
- [x] **회원 본인 인스타그램 계정으로 예약·즉시 게시** — 1차 즉시 게시 v1.14 완료(2026-10-20, `docs/PLAN_20261020_INSTA_AUTOPOST.md`), 2차 예약 게시·게시 기록 v1.15 완료(2026-10-20, `docs/PLAN_20261020_INSTA_SCHEDULE.md`, 예약 등록·취소 실검수 / 실제 게시는 첫 회원 사용 때 확인) — 「모든 인스타 자동화 프로그램은 자동 포스팅까지 갖춘다」(주인님 지시). 기준 코드: `insta_auto_poster/src/lib/instagram/client.ts`·`src/lib/posts/publish-core.ts`(회원 본인 Meta 앱·토큰, 캐러셀 게시, 예약 실행·실패 재시도). 공용 기준 코드로 등록한 뒤 사본으로 가져다 쓴다(`docs/SHARED_MODULES.md` 공용화 후보). 결과 이미지는 공개 저장소에 올려 그 주소로 게시(Graph API 요구), 회원 본인 계정 연동은 최상위 규칙대로.
