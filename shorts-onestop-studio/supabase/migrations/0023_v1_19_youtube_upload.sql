-- 2026-10-21 v1.19 유튜브에 바로 올리기 (구조 변경 없음 — 올린 기록은 shorts_onestop_items.data.youtube)
-- 실제 적용: 서비스 키 REST(Claude Code 윈도우). 상세 소개는 🎙️ 단락 끝·🔑 단락 끝 문장, detail_sections.steps[3]·features[3]만 바꿈.
update programs set version = 'v1.19', updated_at = now() where slug = 'shorts-onestop-studio';
