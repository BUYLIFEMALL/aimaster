-- Release metadata only: no schema, environment, entitlement, key or sidebar changes.
UPDATE public.programs
SET version = 'v1.07'
WHERE id = 'bd242e47-7c13-4973-950d-9027f1bbfba9'
  AND slug = 'suno-music-studio'
  AND version IN ('v1.06', 'v1.07');
