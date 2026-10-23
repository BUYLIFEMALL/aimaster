-- AIMaster 메인 카탈로그와 음악 서브프로젝트의 표시명을 일치시킨다.
UPDATE public.programs
SET name = '음악(SUNO)자동화'
WHERE slug = 'music-automation';
