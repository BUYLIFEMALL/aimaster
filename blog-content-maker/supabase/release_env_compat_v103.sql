-- Release metadata only. No schema, entitlement or credential changes.
update public.programs
set version = 'v1.03',
    extension_version = 'v1.03',
    extension_download_url = 'https://blog-content-maker.buylife.xyz/downloads/blog-content-maker-extension-latest.zip'
where slug = 'blog-content-maker' and version in ('v1.02', 'v1.03')
returning slug, version, extension_version, extension_download_url;
