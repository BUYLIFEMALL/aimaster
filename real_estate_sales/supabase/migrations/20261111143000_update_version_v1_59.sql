-- real-estate-sales v1.59 버전 갱신 (화면 리뉴얼 동기화)
update public.programs
set version = 'v1.59', updated_at = now()
where slug = 'real-estate-sales';
