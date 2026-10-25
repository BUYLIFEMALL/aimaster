-- realty-listing-alert v1.20: 「🔑 어떤 값을 어디서 가져오나요?」 키 위치 안내 표·입력 칸 안내 (운영 DB esgxyikcnnvmlhygjkth)
update public.programs set version = 'v1.20', extension_version = 'v1.20', extension_download_url = 'https://realty-listing-alert.buylife.xyz/downloads/realty-listing-alert-extension-latest.zip', updated_at = now() where slug = 'realty-listing-alert' returning slug, version, extension_version;
