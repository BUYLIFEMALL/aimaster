-- 2026-10-15 ai-task-planner v1.06: C4 개선 3건(키 상태 확인 중 문구, AI 결과 한국어 표현, 모델 저장 안내). 스키마 변경 없음.
update programs set version = 'v1.06', updated_at = now() where slug = 'ai-task-planner';
