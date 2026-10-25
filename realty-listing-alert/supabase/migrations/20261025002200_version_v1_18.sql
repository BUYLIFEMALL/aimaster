-- realty-listing-alert v1.18: 카카오 연결 매뉴얼 7단계(새 카카오 개발자 화면 위치)·카톡 카드 안내 문구 (운영 DB esgxyikcnnvmlhygjkth)
update public.programs set version = 'v1.18', extension_version = 'v1.18', extension_download_url = 'https://realty-listing-alert.buylife.xyz/downloads/realty-listing-alert-extension-latest.zip', updated_at = now() where slug = 'realty-listing-alert' returning slug, version, extension_version;
