update programs
set version = 'v1.30',
    extension_version = 'v1.30',
    extension_download_url = 'https://trending-product-finder.buylife.xyz/downloads/trending-product-finder-extension-latest.zip',
    updated_at = now()
where slug = 'trending-product-finder';
