-- v1.96 (2026-10-22): 작업 화면에서 고른 AI 회사·모델을 브라우저에 기억(새로고침해도 유지, 목록에 없는 모델은 기본값). 버전·확장 버전 갱신(확장 코드 변경 없음).
update public.programs set version = 'v1.96', extension_version = 'v1.96', updated_at = now() where slug = 'naver-blog-seo-studio';
