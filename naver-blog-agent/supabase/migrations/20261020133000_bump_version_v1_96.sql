-- 2026-10-20 v1.96: 원고 목록 API가 예약 여부·시각(is_reserved, scheduled_at)을 내보내도록 수정(v1.95 예약 배지가 새로고침 뒤 사라지던 문제). 확장 코드 변경 없음, manifest·ZIP 버전 동기화.
update public.programs set version = 'v1.96', extension_version = 'v1.96', updated_at = now() where slug = 'naver-blog-agent';
