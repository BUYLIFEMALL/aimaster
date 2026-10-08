-- 기존 스키마는 변경하지 않으며 이 프로그램의 표시 버전만 동기화합니다.
update public.programs
set version = 'v1.34', updated_at = now()
where slug = 'naver-blog-agent';
