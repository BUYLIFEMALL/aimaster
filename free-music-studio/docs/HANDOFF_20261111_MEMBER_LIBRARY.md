# 「내 자료함」 연동 안내 — 음악 담당께 (2026-11-11)

> 작성: Claude Code(윈도우) · 세션 `claude-win-rea` · [역할: 미지정] · 주인님 지시·승인(2026-11-11)
> 이 문서는 `docs/IMPROVEMENTS.md`가 다른 세션 작업 중(미커밋)이라 따로 만들었습니다. 담당 세션이 확인한 뒤 `IMPROVEMENTS.md` 맨 위로 옮기고 이 파일은 지워도 됩니다.

## 무엇이 바뀌었나
- 운영 DB(ref `esgxyikcnnvmlhygjkth`)에 공용 자료 목록 `member_assets`와 트리거를 달았습니다 — `supabase/migrations/0059_member_assets.sql`(루트).
- 이 프로그램의 `free_music_tracks` 곡(휴지통 제외)이 생기거나 제목·휴지통 상태가 바뀌면 자료함 줄이 자동으로 생기거나 지워집니다(트리거 `member_assets_sync_fms`).
- **원본 곡 줄을 지우면 자료함 줄도 함께 지워집니다** → 자료함 보관 기간이 이 프로그램 정리 규칙(30일, 관리자·시험 계정 제외)을 그대로 따릅니다.
- **이 프로그램 코드는 바꾸지 않았고 재배포도 필요 없습니다.**

## 자료함에서 어떻게 보이나
- 메인 사이트 https://www.buylife.xyz/library 「🎵 음악」 탭 — 「AI 무료음악 자동화」 묶음으로 곡 제목·길이·스타일이 보입니다.
- **음원은 회원 PC 엔진에만 있어** 자료함에서는 재생하지 않고 「음원은 내 PC(무료음악 프로그램)에 있습니다」 안내를 보여 줍니다(`meta.local_only = true`).
- 2026-11-11 운영 적용 결과: 무료음악 57곡 = 원본(휴지통 제외) 57곡과 일치. 시험 곡 넣기 → 자료함 1줄, 지우기 → 0줄 확인(시험 곡 삭제 완료).

## 담당께 부탁
1. `free_music_tracks`의 칸 이름(`title`, `trashed_at`, `style_prompt`, `lyrics`, `duration_sec`, `user_id`)을 바꾸거나 표를 옮기기 전에 트리거 함수 `public.member_assets_sync_fms()`를 함께 고쳐 주세요. 트리거 오류는 원본 저장 실패로 이어집니다.
2. 나중에 음원을 서버(저장소)에도 올리게 되면, 트리거에 `bucket`·`path`를 채우도록 바꾸면 자료함에서 바로 재생됩니다(경로는 `{user_id}/…` 규칙).
3. 확인을 마치면 이 내용을 `docs/IMPROVEMENTS.md` 맨 위로 옮겨 주세요.

## 관련 문서
- 플랜: `docs/PLAN_20261111_MEMBER_LIBRARY.md`(루트) · 분석: `docs/analysis-member-library-20261111/REPORT.md`
- 같은 안내: `ai-music-studio/docs/IMPROVEMENTS.md`, `music/docs/IMPROVEMENTS.md` 맨 위
