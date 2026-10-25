-- realty-listing-alert v1.21: 플랫폼별 「📖 연동 방법」 상자(각 연동 칸 밑, 단계 한 줄씩) (운영 DB esgxyikcnnvmlhygjkth)
update public.programs set version = 'v1.21', extension_version = 'v1.21', extension_download_url = 'https://realty-listing-alert.buylife.xyz/downloads/realty-listing-alert-extension-latest.zip', updated_at = now() where slug = 'realty-listing-alert' returning slug, version, extension_version;
