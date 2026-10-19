-- 2026-10-19 v1.04(L5 중복 업로드 차단, L6 Tavily 경로 기록, U1~U4 화면 편의) 배포.
-- 운영 DB esgxyikcnnvmlhygjkth 에 서버 키 REST로 적용함(아래와 같은 내용). 표 구조 변경 없음.
update programs set version = 'v1.04', updated_at = now() where slug = 'ai-doc-chatbot';
