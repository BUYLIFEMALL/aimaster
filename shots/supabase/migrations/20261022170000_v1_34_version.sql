-- v1.34 (2026-10-22): 다크 화면에서 안 보이던 글자 정리(화면 제목·설명 5곳, 스크립트 장면 카드 제목·이름표·입력칸, 주제 수집 입력칸 4곳), 흰 카드 안 선택칸 2곳은 흰 카드 색으로 되돌림. 표 구조 변경 없음.
update public.programs set version='v1.34', updated_at=now() where slug='auto-shorts-posting';
