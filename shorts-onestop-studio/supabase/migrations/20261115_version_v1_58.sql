-- v1.58 버그: 「내 자료함」 음악 검사식 역슬래시(70528df0f) + 화면 수정 2건(5ba0f2aa6·b1cb6878b). 스키마 변경 없음.
update programs set version = 'v1.58', updated_at = now() where slug = 'shorts-onestop-studio';
