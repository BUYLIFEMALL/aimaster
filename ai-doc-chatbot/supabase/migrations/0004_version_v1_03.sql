-- 2026-10-19 v1.02(L7~L10 답변 품질) 배포 직후 물결표 취소선 수정으로 v1.03 재배포.
-- 운영 DB esgxyikcnnvmlhygjkth 에 서버 키 REST로 적용함(아래와 같은 내용).
update programs set version = 'v1.03', updated_at = now() where slug = 'ai-doc-chatbot';
