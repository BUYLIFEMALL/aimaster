-- 2026-10-17 v1.11: 구글 이미지 모델 최신 정식으로 교체(nano-banana-2.1·3-pro-image·3.1-flash-lite-image, DB 구조 변경 없음)
update programs set version = 'v1.11', updated_at = now() where slug = 'ai-image-studio';
