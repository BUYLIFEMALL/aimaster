-- v1.05 (2026-10-25, 지역(시·구·동) 감시 + 다음 페이지 읽기 수정(겹친 페이지 버림) + 연결 계정 대조·표시). 실행: 주인님(크롬 SQL 편집기 Run).
update public.programs
set version = 'v1.05',
    extension_version = 'v1.05',
    extension_download_url = 'https://realty-listing-alert.buylife.xyz/downloads/realty-listing-alert-extension-latest.zip',
    updated_at = now()
where slug = 'realty-listing-alert'
returning slug, version, extension_version;
