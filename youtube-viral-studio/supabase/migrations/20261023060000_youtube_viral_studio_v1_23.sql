-- v1.23 대본 분석 오류를 카드 안 안내로 · 영상 요약(쇼츠) 대사 → AI 쇼츠 원스톱(DB 구조 변경 없음)
update programs set version = 'v1.23', updated_at = now() where slug = 'youtube-viral-studio';
