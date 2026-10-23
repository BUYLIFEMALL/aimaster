-- v1.10 (2026-10-16): Instagram 앱 ID 안내 문구를 실제 Meta 메뉴 이름(이용 사례 › 맞춤 설정 › Instagram 로그인이 포함된 API 설정)으로 정정
update public.programs set version='v1.10', updated_at=now() where slug='instagram-comment-reply';
