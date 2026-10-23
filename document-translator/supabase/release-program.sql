-- Existing metadata only; approved release scope. Touch this program only.
begin;
insert into public.grade_program_access(grade_id,program_id,can_access)
select g.id,p.id,true from public.member_grades g cross join public.programs p
where g.slug='vip' and p.slug='document-translator'
and not exists(select 1 from public.grade_program_access a where a.grade_id=g.id and a.program_id=p.id);
-- The existing trigger creates grade grants. Align this new program's grants with
-- the established grade-assigned-date + default period policy; no other rows change.
update public.user_program_access u
set expires_at=case when g.default_access_days is null then null
  else coalesce(m.grade_assigned_at,now())+make_interval(days=>g.default_access_days) end
from public.profiles m,public.member_grades g,public.programs p
where u.user_id=m.id and m.grade_id=g.id and u.granted_grade_id=g.id
and u.program_id=p.id and u.grant_source='grade'
and g.slug='vip' and p.slug='document-translator';
update public.programs set is_active=true,version='v1.03',updated_at=now()
where slug='document-translator' and thumbnail_url is not null;
commit;
