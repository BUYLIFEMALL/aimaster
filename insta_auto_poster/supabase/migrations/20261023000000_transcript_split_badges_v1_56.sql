-- v1.56 (2026-10-22): 릴스 받아쓰기를 후킹(첫 문장)·본문·마무리(마지막 문장)로 나눠 원문에 넣기, 떡상 분석 재료 배지. AI 호출·표 구조 변경 없음.
update public.programs set version='v1.56', updated_at=now() where slug='auto-instagram-posting';
