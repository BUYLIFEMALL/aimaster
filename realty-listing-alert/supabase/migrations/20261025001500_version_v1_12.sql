-- v1.12 (2026-10-25, 대시보드 최근 수집 결과 표(확장에서 직접, 서버 미경유)·시작하기 다른 PC 동작 인식·카톡 글자 라벨). 실행: 주인님(크롬 SQL 편집기 Run).
update public.programs
set version = 'v1.12',
    extension_version = 'v1.12',
    extension_download_url = 'https://realty-listing-alert.buylife.xyz/downloads/realty-listing-alert-extension-latest.zip',
    updated_at = now()
where slug = 'realty-listing-alert'
returning slug, version, extension_version;
