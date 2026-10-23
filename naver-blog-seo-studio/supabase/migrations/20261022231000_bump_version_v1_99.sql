-- v1.99 (2026-10-22, BLC-10): 본문 이미지 노드 단위 — 빈 칸 구성(plan-content)·노드 하나 만들기/요청 고쳐 다시 만들기(regenerate-content)·삭제(delete-content)·문단에 넣기(add-content), 노드 하나만 저장(최신 원고 재조회). 옛 일괄 생성(generate-content) 삭제. 버전·확장 버전 갱신(확장 코드 변경 없음).
update public.programs set version = 'v1.99', extension_version = 'v1.99', updated_at = now() where slug = 'naver-blog-seo-studio';
