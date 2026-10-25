-- realty-listing-alert v1.15: 통계·추이 대시보드 + 이름 「부동산 실시간 매물 알림」 (운영 DB esgxyikcnnvmlhygjkth)
update public.programs set version = 'v1.15', extension_version = 'v1.15', extension_download_url = 'https://realty-listing-alert.buylife.xyz/downloads/realty-listing-alert-extension-latest.zip', updated_at = now() where slug = 'realty-listing-alert' returning slug, version, extension_version;
