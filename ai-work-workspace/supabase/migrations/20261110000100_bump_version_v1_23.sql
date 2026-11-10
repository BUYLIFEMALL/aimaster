-- ai-work-workspace v1.23 (2026-11-10): U11 자동화(데이터베이스 자동화·버튼 열기, 회원 본인 cron-job.org 정시 실행, 실행 기록·알림 30일 정리) + 받은 업무 이름표 실제 slug(3c175bcce)
update public.programs set version = 'v1.23', updated_at = now() where slug = 'ai-work-workspace';
