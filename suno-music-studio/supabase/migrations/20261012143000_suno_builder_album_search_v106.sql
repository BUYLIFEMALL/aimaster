-- Program release metadata only: no schema, environment, entitlement or key changes.
UPDATE public.programs
SET version = 'v1.06'
WHERE id = 'bd242e47-7c13-4973-950d-9027f1bbfba9'
  AND slug = 'suno-music-studio'
  AND version IN ('v1.05', 'v1.06');
