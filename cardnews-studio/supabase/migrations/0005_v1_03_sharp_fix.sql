-- CARDNEWS STUDIO v1.03 (2026-10-11): 운영에서 sharp(libvips) 누락으로 배경 생성이 500이던 문제 수정(next.config.ts) + 버전.
update public.programs set version = 'v1.03', updated_at = now() where slug = 'cardnews-studio';
