-- v1.07 (2026-10-25, 주소 추가 칸 여유 배치: 3단계 안내 전체 폭·주소 2:이름 1·높이 맞춤). 실행: 주인님(크롬 SQL 편집기 Run).
update public.programs
set version = 'v1.07',
    extension_version = 'v1.07',
    extension_download_url = 'https://realty-listing-alert.buylife.xyz/downloads/realty-listing-alert-extension-latest.zip',
    updated_at = now()
where slug = 'realty-listing-alert'
returning slug, version, extension_version;
