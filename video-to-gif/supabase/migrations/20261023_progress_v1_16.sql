-- v1.16: 변환 진행률 바로잡기(출력 시간 기준·시도 안에서 줄지 않음·두 번 방식 앞뒤 절반) — DB 구조 변경 없음, 버전만.
update public.programs set version = 'v1.16', updated_at = now() where slug = 'video-to-gif';
select slug, version from public.programs where slug = 'video-to-gif';
