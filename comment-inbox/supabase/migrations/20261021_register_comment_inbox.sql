-- 2026-10-21 AI 댓글·DM 통합 받은편지함(comment-inbox) v1.01 등록 (운영 DB esgxyikcnnvmlhygjkth, REST로 적용 완료 — 기록용)
-- 새 표·구조 변경 없음. 받은편지함은 ig_comments·dm_messages·dm_conversations·ig_media·th_comments·th_posts·ytreply_comments·ytreply_videos를
-- 회원 본인 행(user_id)만 읽고, 승인 시 원래 댓글 프로그램과 같은 게시 함수(공용 기준 코드 사본)로 status를 바꾼다.
insert into public.programs (name, slug, category_id, short_desc, required_grade_id, app_url, version, is_active, badges, sort_order)
values ('AI 댓글·DM 통합 받은편지함', 'comment-inbox', '923c8712-bf8b-47e5-bb64-fea6d7606a27',
        '인스타·쓰레드·유튜브 댓글과 DM을 한곳에 모아 급한 순서대로 바로 응대하는 통합 받은편지함',
        '861b7a37-d056-4404-80f5-85edb2e2ebff', 'https://comment-inbox.buylife.xyz', 'v1.01', true, '{}', 1);
-- description·detail_sections(features 4·steps 4·audiences 3)는 같은 날 함께 입력(docs/PROGRAM_DESCRIPTION_STANDARD.md 형식).
-- 기본 요금제 3단계: 1개월 10,000 / 2개월 20,000 / 3개월 30,000 (monthly·bimonthly·quarterly)
-- 등급 연결: VIP(드림AI팀) can_access=true → VIP 회원 142명 user_program_access 자동 부여 확인. 다른 등급은 주인님 결정.
