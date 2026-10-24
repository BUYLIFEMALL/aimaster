-- v1.02 (2026-10-25, 2단계: 감시 대상·예약 설정·받는 방법 화면 + 기존 부동산 봇 가져오기 + 메뉴 밑줄 수정). 실행: 주인님(크롬 SQL 편집기 Run).
update public.programs
set version = 'v1.02',
    extension_version = 'v1.02',
    extension_download_url = 'https://realty-listing-alert.buylife.xyz/downloads/realty-listing-alert-extension-latest.zip',
    updated_at = now()
where slug = 'realty-listing-alert'
returning slug, version, extension_version;
