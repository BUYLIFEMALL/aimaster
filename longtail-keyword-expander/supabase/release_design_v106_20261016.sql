-- Release metadata only; no schema, account, key, or member-data changes.
update public.programs
set version = 'v1.06', updated_at = now()
where slug = 'longtail-keyword-expander'
  and version in ('v1.05', 'v1.06');

select slug, version, app_url
from public.programs
where slug = 'longtail-keyword-expander';
