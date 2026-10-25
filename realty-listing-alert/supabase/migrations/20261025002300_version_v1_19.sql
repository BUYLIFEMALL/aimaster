-- realty-listing-alert v1.19: 실거래가 비교(국토부 아파트 매매 실거래가, 전국)·휴대폰 화면 보정 (운영 DB esgxyikcnnvmlhygjkth)
update public.programs set version = 'v1.19', extension_version = 'v1.19', extension_download_url = 'https://realty-listing-alert.buylife.xyz/downloads/realty-listing-alert-extension-latest.zip', updated_at = now() where slug = 'realty-listing-alert' returning slug, version, extension_version;
