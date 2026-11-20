-- 2026-11-20 v2.31: 없는 블로그 감지·하위 프레임 오탐 보완·권한 거부 우선·프록시 세션 갱신, 확장 코드 변경 포함
update public.programs set version = 'v2.31', extension_version = 'v2.31', updated_at = now() where slug = 'naver-blog-agent';
