-- v1.11 (2026-10-21) 이미지 병합 A: 바나나 캔버스로 합쳐져 카탈로그에서 숨김(주소·브라우저 보관함은 유지).
update public.programs set is_active = false, version = 'v1.11', updated_at = now() where slug = 'photo-remake-studio';
