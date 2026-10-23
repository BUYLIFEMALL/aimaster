-- v1.54 (2026-10-22): 수집한 릴스 「🎬 영상까지 분석」(서버가 회원 본인 Gemini 키로 Files API에 잠깐 올리고 분석 뒤 삭제, 저장 안 함) + 수집 결과 유형 필터(릴스·캐러셀·사진). 표 구조 변경 없음.
update public.programs set version='v1.54', updated_at=now() where slug='auto-instagram-posting';
