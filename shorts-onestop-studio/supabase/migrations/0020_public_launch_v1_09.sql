-- v1.09 (2026-10-16): P8 정식 공개 — 개발 중(coming) 배지를 새 프로그램(new) 배지로 교체.
-- VIP(드림AI팀) 등급 자동 부여: grade_program_access에 이미 체크돼 있어(can_access=true) 트리거 grade_program_access_sync로 VIP 회원 138명 전원 부여 확인(2026-10-16).
-- 나머지 등급(일반·실버·골드)은 주인님이 직접 수정·부여(2026-10-16 주인님 지시) — 여기서 건드리지 않는다.
update public.programs set badges = array_replace(badges, 'coming', 'new'), version = 'v1.09', updated_at = now() where slug = 'shorts-onestop-studio';
-- 확인: VIP 체크(없으면 추가 — 트리거가 VIP 회원에게 자동 부여)
insert into public.grade_program_access (grade_id, program_id, can_access)
select g.id, p.id, true from public.member_grades g, public.programs p
where g.name = 'VIP(드림AI팀)' and p.slug = 'shorts-onestop-studio'
on conflict (grade_id, program_id) do update set can_access = true;
