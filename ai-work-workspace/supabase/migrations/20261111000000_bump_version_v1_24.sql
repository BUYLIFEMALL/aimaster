-- ai-work-workspace v1.24 (2026-11-11): U12 업무 비서(맞춤 에이전트) — 에이전트 열기(공유·바깥 연결 제외), 백그라운드 실행은 주인 회원 본인 키로, 정시 비서는 회원 cron-job.org로, 새 비서 월 상한 700 크레딧·비용 안내, 웹 검색 끔, 한국어 템플릿 6종, 자동화 화면 한국어화
update public.programs set version = 'v1.24', updated_at = now() where slug = 'ai-work-workspace';
