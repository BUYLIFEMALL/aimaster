-- v1.15: 변환 속도 개선(한 번에 만들기·사다리 건너뛰기, 화질 같음), 진행률 정수 표시 — DB 구조 변경 없음, 버전만.
update public.programs set version = 'v1.15', updated_at = now() where slug = 'video-to-gif';
select slug, version from public.programs where slug = 'video-to-gif';
