-- 네이버 블로그 자동화 두 프로그램의 표시 이름을 사용자 지정 형식으로 통일한다.
-- "네이버 블로그 자동화 - PC 앱" / "- 크롬 확장" -> "(App)" / "(Web)" 표기로 변경.
update programs set name = '네이버 블로그 자동화(App)' where slug = 'naver-blog-auto-poster';
update programs set name = '네이버 블로그 자동화(Web)' where slug = 'naver-blog-auto-poster-web';
