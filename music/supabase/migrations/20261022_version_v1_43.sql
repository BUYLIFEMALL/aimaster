-- 2026-10-22 v1.43: 기획 상세에서 곡마다 넣을 버전(#1·#2·빼기)을 골라 플레이리스트·목차·CSV로.
update public.programs set version = 'v1.43', updated_at = now() where slug = 'music-automation';
