-- v1.86 (2026-10-22, BLC-08b 보완): 승인 문체가 있으면 말투·끝맺음은 문체를 페르소나보다 우선. 버전·확장 버전 갱신(확장 코드 변경 없음).
update public.programs set version = 'v1.86', extension_version = 'v1.86', updated_at = now() where slug = 'naver-blog-seo-studio';
