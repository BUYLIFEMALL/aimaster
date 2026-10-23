-- v1.03: extension ZIP is served from the site (public/downloads) instead of a GitHub release, so the repo can go private.
update public.programs
set version = 'v1.03',
    extension_version = 'v1.03',
    extension_download_url = 'https://www.buylife.xyz/downloads/naver-blog-auto-poster-web-extension-latest.zip',
    updated_at = now()
where slug = 'naver-blog-auto-poster-web';

-- Desktop app page changed (installer download now served from the site).
update public.programs set version = 'v1.02', updated_at = now() where slug = 'naver-blog-auto-poster';
