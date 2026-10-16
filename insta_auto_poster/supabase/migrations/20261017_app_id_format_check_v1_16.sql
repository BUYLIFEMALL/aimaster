-- 2026-10-17 v1.16: Meta 앱 ID(숫자 15~16자리)·시크릿(영문·숫자 32자) 저장 형식 검사
update programs set version = 'v1.16', updated_at = now() where slug = 'auto-instagram-posting';
