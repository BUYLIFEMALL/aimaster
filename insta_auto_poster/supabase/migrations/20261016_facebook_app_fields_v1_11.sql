-- v1.11 (2026-10-16): Facebook 페이지 방식 전용 앱 ID/시크릿 칸(facebook_app_id/secret, 루트 0037) — Instagram 로그인 방식과 칸 분리
update public.programs set version='v1.11', updated_at=now() where slug='auto-instagram-posting';
