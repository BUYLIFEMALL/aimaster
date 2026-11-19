-- 2026-11-19 v2.29: 본문 모델 목록 최신화·저장 엔진 복원(restoreEngine)·사진 리뷰 선택지 교체 묶음 배포, 확장 버전·ZIP 함께
update public.programs set version = 'v2.29', extension_version = 'v2.29', extension_download_url = 'https://naver-blog-agent.buylife.xyz/downloads/naver-blog-agent-extension-latest.zip', updated_at = now() where slug = 'naver-blog-agent';
