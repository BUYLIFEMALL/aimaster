-- v1.13 Gemini 영상 직접 분석 때 대사 받아쓰기 → AI 쇼츠 원스톱 넘기기(DB 구조 변경 없음)
update programs set version = 'v1.13', updated_at = now() where slug = 'shorts-viral-studio';
