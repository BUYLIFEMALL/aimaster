-- v1.61 (2026-11-16): 지역 뉴스 잡음 줄이기(묶음 기사·지나가는 언급 빼기, 동 이름 제목 판정) + 로그인 정책(로그아웃 이 브라우저만, 서버 로그인 기기 정보 전달). 운영 DB 적용 완료.
update programs set version = 'v1.61', updated_at = now() where slug = 'real-estate-sales';
