-- 정식 공개(2026-10-31 주인님 승인). 대상: 운영 DB esgxyikcnnvmlhygjkth. 썸네일은 scripts/generate-program-thumbnail.mjs로 반영.
update programs set badges = array_remove(badges, 'coming'), updated_at = now() where slug = 'commercial-land-trade-alert';
insert into public.grade_program_access (grade_id, program_id, can_access)
select g.id, p.id, true from member_grades g, programs p
where g.name = 'VIP(드림AI팀)' and p.slug = 'commercial-land-trade-alert'
  and not exists (select 1 from public.grade_program_access x where x.grade_id = g.id and x.program_id = p.id);
