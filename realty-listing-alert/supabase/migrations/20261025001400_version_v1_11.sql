-- v1.11 (2026-10-25, 카톡 웹 도메인 안내 상자(도메인 빨간 강조)·켜기 칸 한 줄·버튼 한 줄 배치). 실행: 주인님(크롬 SQL 편집기 Run).
update public.programs
set version = 'v1.11',
    extension_version = 'v1.11',
    extension_download_url = 'https://realty-listing-alert.buylife.xyz/downloads/realty-listing-alert-extension-latest.zip',
    updated_at = now()
where slug = 'realty-listing-alert'
returning slug, version, extension_version;
