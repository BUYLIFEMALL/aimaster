-- v1.22 대본 분석: Gemini가 유튜브 영상을 직접 보고 실제 대사까지 받아씀(자막 긁어오기 빈 값 대응) + 대사 → AI 쇼츠 원스톱(DB 구조 변경 없음)
update programs set version = 'v1.22', updated_at = now() where slug = 'youtube-viral-studio';
