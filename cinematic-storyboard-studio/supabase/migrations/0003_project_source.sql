-- v1.13 (2026-10-22): 다른 프로그램에서 보낸 참고 이미지로 만든 프로젝트의 보낸 곳(공용 link-mark 이름표, 예: 'banana-canvas')
-- 빈 값 허용 · 기존 행 영향 없음. 코드는 이 칸이 없어도 프로젝트 만들기가 실패하지 않게 따로 저장한다.
alter table public.storyboard_projects add column if not exists source text;
