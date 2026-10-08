-- 표시 버전만 동기화하며 DB 스키마/회원 데이터는 변경하지 않습니다.
update public.programs
set version = 'v1.35', updated_at = now()
where slug = 'naver-blog-agent';
