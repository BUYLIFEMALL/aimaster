-- v1.10 (2026-10-16): 설정 화면에 Instagram 앱 ID 위치 안내(Facebook 앱 ID 오입력 → Invalid platform app 방지)
update public.programs set version='v1.10', updated_at=now() where slug='auto-instagram-posting';
