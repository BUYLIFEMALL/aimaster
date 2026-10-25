-- v1.13 (2026-10-25, 왼쪽 메뉴 「4 · 📄 수집 결과」 전용 화면 /results). 실행: 주인님 요청 시 Claude가 크롬 SQL 편집기에서 실행.
update public.programs
set version = 'v1.13',
    extension_version = 'v1.13',
    extension_download_url = 'https://realty-listing-alert.buylife.xyz/downloads/realty-listing-alert-extension-latest.zip',
    updated_at = now()
where slug = 'realty-listing-alert'
returning slug, version, extension_version;
