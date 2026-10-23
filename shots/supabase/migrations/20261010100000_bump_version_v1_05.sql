-- shots v1.05: 로그인 화면 제목을 두 줄("YOUTUBE Shots 자동화" / "(이미지 스토리)")로 표시
update programs set version = 'v1.05', updated_at = now() where slug = 'auto-shorts-posting';
