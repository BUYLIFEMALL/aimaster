-- v1.09 (2026-10-25, 카톡 「결과 보기」→ 첫 새 매물 네이버 화면(/api/go)·웹 도메인 안내, 이메일 받는 주소 안내 개선). 실행: 주인님(크롬 SQL 편집기 Run).
update public.programs
set version = 'v1.09',
    extension_version = 'v1.09',
    extension_download_url = 'https://realty-listing-alert.buylife.xyz/downloads/realty-listing-alert-extension-latest.zip',
    updated_at = now()
where slug = 'realty-listing-alert'
returning slug, version, extension_version;
