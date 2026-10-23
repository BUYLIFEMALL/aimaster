-- Program version shown on the catalog, detail page and each program's sidebar.
-- Format: v<major>.<two-digit minor>. Every change to a program bumps the minor by 0.01
-- (v1.01 -> v1.02); a major rework or completion milestone bumps to the next major (v2.01).
-- The same value is kept in each subproject's lib/version.ts; update both in the same task.
alter table public.programs
  add column if not exists version text not null default 'v1.00'
  constraint programs_version_format check (version ~ '^v[0-9]+\.[0-9]{2}$');

-- 2026-09-29: versioning starts; every program begins at v1.01.
update public.programs set version = 'v1.01';
