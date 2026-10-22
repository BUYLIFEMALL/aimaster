-- v1.90 (2026-10-22, BLC-08b 보완 — v1.88·v1.89 되돌림 후): 보강 요청은 v1.87 그대로, 보강이 끝난 뒤 끝맺음 비율 70% 미만이면 끝맺음만 고치는 요청 1회(1,500자·원래 길이 이상·비율 개선 시만 채택). 버전·확장 버전 갱신(확장 코드 변경 없음).
update public.programs set version = 'v1.90', extension_version = 'v1.90', updated_at = now() where slug = 'naver-blog-seo-studio';
