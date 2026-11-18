-- 2026-11-18 tistory-auto-blog v1.98 (CC-BLOG-01): AI 소제목 앞 ## 제거(a27861137) 배포. 운영 DB에는 deploy.mjs --set-version + extension_version 1행으로 적용함.
update public.programs set version = 'v1.98', extension_version = 'v1.98', updated_at = now() where slug = 'tistory-auto-blog';
