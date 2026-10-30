-- realty-listing-alert v1.39: 수집 결과 단지 비교 표에 「📈 실거래」 바로가기 (운영 DB esgxyikcnnvmlhygjkth)
update public.programs set version = 'v1.39', extension_version = 'v1.39', extension_download_url = 'https://realty-listing-alert.buylife.xyz/downloads/realty-listing-alert-extension-latest.zip', updated_at = now() where slug = 'realty-listing-alert' returning slug, version, extension_version;
