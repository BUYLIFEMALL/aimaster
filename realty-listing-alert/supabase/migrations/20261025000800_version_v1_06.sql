-- v1.06 (2026-10-25, 예약 간격 1~24시간 + 수집 상한(회차 20곳·하루 300페이지·예약 시각 ±10%) + 예상 수집량·제한 안내 + 주소 붙여 넣기 칸 쉬운 말). 실행: 주인님(크롬 SQL 편집기 Run).
update public.programs
set version = 'v1.06',
    extension_version = 'v1.06',
    extension_download_url = 'https://realty-listing-alert.buylife.xyz/downloads/realty-listing-alert-extension-latest.zip',
    updated_at = now()
where slug = 'realty-listing-alert'
returning slug, version, extension_version;
