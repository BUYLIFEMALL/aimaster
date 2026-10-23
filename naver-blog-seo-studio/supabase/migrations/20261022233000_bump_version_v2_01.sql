-- v2.01 (2026-10-22): 본문 이미지 최대 6장(content-1~6, 장수 2~6 선택), 「내 사진」으로 노드 바꾸기·문단 앞에 넣기(upload-content, AI 호출 없음). 버전·확장 버전 갱신(확장 코드 변경 없음).
update public.programs set version = 'v2.01', extension_version = 'v2.01', updated_at = now() where slug = 'naver-blog-seo-studio';
