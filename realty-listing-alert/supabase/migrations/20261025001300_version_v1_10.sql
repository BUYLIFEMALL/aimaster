-- v1.10 (2026-10-25, 중개사 사무실·휴대폰 번호(새·변동 매물, 회원 PC·알림만), 엑셀 링크 바로 열기, 버튼 위치 조정). 실행: 주인님(크롬 SQL 편집기 Run).
update public.programs
set version = 'v1.10',
    extension_version = 'v1.10',
    extension_download_url = 'https://realty-listing-alert.buylife.xyz/downloads/realty-listing-alert-extension-latest.zip',
    updated_at = now()
where slug = 'realty-listing-alert'
returning slug, version, extension_version;
