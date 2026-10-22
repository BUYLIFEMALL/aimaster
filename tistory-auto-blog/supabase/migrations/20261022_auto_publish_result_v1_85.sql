-- v1.85 (2026-10-22): 자동 발행 결과 기록 보완 — 확장만 변경, 표 변경 없음. npm run sync:program-version으로 적용.
update public.programs set version = 'v1.85', extension_version = 'v1.85',
  extension_download_url = 'https://tistory-auto-blog.buylife.xyz/downloads/tistory-auto-blog-extension-latest.zip', updated_at = now()
where slug = 'tistory-auto-blog';
