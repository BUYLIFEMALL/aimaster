-- ai-work-workspace v1.10 (2026-10-24): 디자인 역할(agy) 스마트 프로 인디고 워크스페이스 스타일 리뉴얼 배포분(코드 v1.10, 커밋 d9b975c95). v1.08~v1.09는 건너뜀 — DB만 v1.07로 남아 있던 것을 맞춤
update public.programs set version = 'v1.10', updated_at = now() where slug = 'ai-work-workspace';
