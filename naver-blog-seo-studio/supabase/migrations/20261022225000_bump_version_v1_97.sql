-- v1.97 (2026-10-22): 글쓰기 기본 AI(회사·모델)를 계정(user_metadata.naver_blog_seo_content_model)에 저장해 PC 간 유지, OpenAI 전용 기능(제목 추천·분석·최적화·이미지 고르기)은 기본 AI가 OpenAI면 같은 모델, 설정 화면 AI 모델 칸 복구. 버전·확장 버전 갱신(확장 코드 변경 없음).
update public.programs set version = 'v1.97', extension_version = 'v1.97', updated_at = now() where slug = 'naver-blog-seo-studio';
