-- Initial v1.01 release: production login 200, guest page redirect and API 401 verified.
UPDATE public.programs SET is_active = true, updated_at = now()
WHERE slug = 'suno-music-studio' AND version = 'v1.01';

-- Only the existing normal-member test account gets a bounded verification period.
-- Fixed expiry prevents extending this grant on replay. Never change other members.
INSERT INTO public.user_program_access (user_id, program_id, granted_by, expires_at)
SELECT t.id, p.id, a.id, '2026-10-13T06:09:50.664172Z'::timestamptz
FROM public.profiles t CROSS JOIN public.programs p CROSS JOIN public.profiles a
WHERE t.email = 'buylifemall@naver.com' AND p.slug = 'suno-music-studio'
  AND a.email = 'buylifemall@gmail.com' AND a.is_admin = true
  AND NOT EXISTS (
    SELECT 1 FROM public.user_program_access x
    WHERE x.user_id = t.id AND x.program_id = p.id
  );
