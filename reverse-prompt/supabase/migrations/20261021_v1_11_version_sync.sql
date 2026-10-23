-- v1.11 (2026-10-21) 스타일 분석기 연결·30일 정리 cron. DB 버전이 v1.03에 머물러 코드(v1.10)와 어긋나 있던 것을 함께 맞춤(서버 키 스크립트로 적용).
update public.programs set version = 'v1.11', updated_at = now() where slug = 'reverse-prompt';
