-- v1.09 (2026-10-21) 이미지 병합 B: 바나나 캔버스 「템플릿 그래픽」으로 합쳐져 카탈로그에서 숨김(주소 유지, 첫 화면은 이동 안내).
update public.programs set is_active = false, version = 'v1.09', updated_at = now() where slug = 'allinone-graphic';
