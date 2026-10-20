-- 2026-10-20 v1.95: 네이버 랭킹 글감(연예·스포츠·경제), 홈판형 글 구성, 간격 예약 일괄 전송, 쇼핑 커넥트 링크·대가성 문구(확장 코드 변경 없음, manifest·ZIP 버전 동기화).
update public.programs set version = 'v1.95', extension_version = 'v1.95', updated_at = now() where slug = 'naver-blog-agent';
