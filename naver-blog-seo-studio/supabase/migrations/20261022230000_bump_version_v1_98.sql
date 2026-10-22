-- v1.98 (2026-10-22): OpenAI 전용 기능(제목 추천·기존 글 분석/최적화·본문 이미지 고르기) 요청에 화면의 OpenAI 모델(openaiModel)을 함께 보내 계정 저장 전에 눌러도 맞는 모델 사용. 버전·확장 버전 갱신(확장 코드 변경 없음).
update public.programs set version = 'v1.98', extension_version = 'v1.98', updated_at = now() where slug = 'naver-blog-seo-studio';
