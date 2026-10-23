-- v1.07 (2026-10-13): Drive에서 가져온 파일이 올리기 때 새 하위 폴더로 옮겨지던 문제 수정
--  - 실제 Drive 검수에서 발견: 가져오기용 로컬 정리 폴더(`Drive에서 가져옴 날짜`)가 Drive에 새 폴더로 만들어지며 기존 파일이 그 폴더로 이동됨.
--  - 정리 폴더를 Drive 전용 폴더(`마크다운 문서 자동화`)와 연결해 가져온 파일이 제자리에 머물게 함.
UPDATE public.programs SET version = 'v1.07', updated_at = NOW() WHERE slug = 'markdown-studio';
