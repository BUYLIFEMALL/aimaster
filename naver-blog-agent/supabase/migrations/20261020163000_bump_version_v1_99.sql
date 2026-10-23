-- 2026-10-20 v1.99: 여러 기사로 만든 글감마다 가장 관련 있는 기사 하나만 원문(source_text)으로 저장(v1.98은 묶음 앞 4,000자를 모든 글감에 같이 넣음). 확장 코드 변경 없음, manifest·ZIP 버전 동기화.
update public.programs set version = 'v1.99', extension_version = 'v1.99', updated_at = now() where slug = 'naver-blog-agent';
