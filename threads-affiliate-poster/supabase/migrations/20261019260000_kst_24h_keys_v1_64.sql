-- v1.64 (2026-10-19): 날짜 한국 시간 표시 + 24시간 넘게 밀린 예약 미발행 규칙 + 설정 Claude·Replicate 키 저장 허용. DB 구조 변경 없음.
update public.programs set version = 'v1.64', updated_at = now() where slug = 'threads-affiliate-poster';
