-- v1.08 (2026-10-25, 카톡 받기(요약)·이메일 받기(회원 본인 Resend 키, 엑셀 첨부)). 실행: 주인님(크롬 SQL 편집기 Run).
update public.programs
set version = 'v1.08',
    extension_version = 'v1.08',
    extension_download_url = 'https://realty-listing-alert.buylife.xyz/downloads/realty-listing-alert-extension-latest.zip',
    updated_at = now()
where slug = 'realty-listing-alert'
returning slug, version, extension_version;
