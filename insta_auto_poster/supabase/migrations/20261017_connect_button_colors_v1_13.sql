-- 2026-10-17 v1.13: 계정 연결 버튼 색 구분(Facebook=파란색, Instagram=초록색) + Instagram 방식 콜백 실패 사유 표시
update programs set version = 'v1.13', updated_at = now() where slug = 'auto-instagram-posting';
