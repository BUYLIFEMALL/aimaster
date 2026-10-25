-- v1.14 (2026-10-25, 중개사 번호 조금씩 채워 기억(회차당 최대 20건, 회원 PC에만)). 실행: 주인님 또는 주인님 요청 시 Claude(크롬 SQL 편집기).
update public.programs
set version = 'v1.14',
    extension_version = 'v1.14',
    extension_download_url = 'https://realty-listing-alert.buylife.xyz/downloads/realty-listing-alert-extension-latest.zip',
    updated_at = now()
where slug = 'realty-listing-alert'
returning slug, version, extension_version;
