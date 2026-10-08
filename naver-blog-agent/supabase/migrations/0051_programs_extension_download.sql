-- 공용 programs 테이블에 크롬 확장 다운로드 정보를 둔다(주인님 지시 2026-10-09: DB에도 같은 버전의 다운로드가 있어야 함).
-- 다른 프로그램의 행에는 영향이 없다(NULL). 값은 프로그램을 배포할 때 programs.version과 함께 갱신한다.
alter table public.programs
  add column if not exists extension_download_url text,
  add column if not exists extension_version text;

comment on column public.programs.extension_download_url is '크롬 확장 ZIP 다운로드 주소(항상 최신 파일). 프로그램 배포 때 programs.version과 함께 갱신한다.';
comment on column public.programs.extension_version is '위 ZIP 안 manifest의 version_name과 같은 값(예: v1.49).';

update public.programs
set extension_download_url = 'https://naver-blog-agent.vercel.app/downloads/naver-blog-agent-extension-latest.zip',
    extension_version = 'v1.49',
    updated_at = now()
where slug = 'naver-blog-agent';
