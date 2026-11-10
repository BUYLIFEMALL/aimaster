# 「내 자료함」 연동 안내 — 블로그 담당께 (2026-11-11)

> 작성: Claude Code(윈도우) · 세션 `claude-win-rea` · [역할: 미지정] · 주인님 지시
> `docs/IMPROVEMENTS.md`가 다른 세션 작업 중(미커밋)이라 따로 만들었습니다. 확인 뒤 `IMPROVEMENTS.md` 맨 위로 옮기고 이 파일은 지워도 됩니다.

> **🗂️ 「내 자료함」 연동 안내 — 블로그 담당께 (2026-11-11, 세션 `claude-win-rea`, 주인님 지시)**: 운영 DB `supabase/migrations/0061_member_assets_video_text.sql`로 이 프로그램의 원고(`wba_posts` 제목·발췌·상태·`remote_url`·`published_at`)이(가) 공용 자료 목록 `member_assets`에 자동 등록되고, **원본 줄을 지우면 자료함 줄도 함께 지워집니다**(보관 기간 = 이 프로그램 정리 규칙, 발행된 원고는 「발행 1년」 규칙 대상). **이 프로그램 코드·배포는 바꾸지 않았습니다.** 칸 이름·저장 경로(`{user_id}/…`)·상태 값을 바꾸면 트리거 함수 `member_assets_sync_wba`도 함께 고쳐 주세요(트리거 오류 = 원본 저장 실패). 화면: https://www.buylife.xyz/library · 플랜 `docs/PLAN_20261111_MEMBER_LIBRARY.md` §9

- 운영 적용 결과(2026-11-11): 원고 8건 = 원본 8건, 그중 발행 5건은 「발행됨 · 1년 보관」 표시. 시험 줄 넣기→제목 고치기→지우기 확인(1줄·제목 갱신·0줄).
- 참고: 이 프로그램은 발행 이미지 1년 보관을 이미 지정해 두었고(`TOP_RULE` §8), 자료함은 원본 정리를 그대로 따릅니다.
