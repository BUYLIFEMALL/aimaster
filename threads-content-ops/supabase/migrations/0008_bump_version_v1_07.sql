-- Keep the public catalog version synchronized with lib/version.ts.
update public.programs
set version = 'v1.07', updated_at = now()
where slug = 'threads-content-ops';
