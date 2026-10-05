-- Keep the AIMaster catalog version in sync with threads-content-ops/lib/version.ts.
UPDATE public.programs
SET version = 'v1.02', updated_at = NOW()
WHERE slug = 'threads-content-ops';
