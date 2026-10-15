-- v1.02: Gemini search evidence and JSON composition use the member's same provider.
update public.programs
set version='v1.02',extension_version='v1.02',
extension_download_url='https://blog-content-maker.buylife.xyz/downloads/blog-content-maker-extension-latest.zip',updated_at=now()
where slug='blog-content-maker';
