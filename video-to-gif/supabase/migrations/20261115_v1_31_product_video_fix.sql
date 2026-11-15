-- v1.31(2026-11-15): 상품 사진 영상 상세페이지 크기 860×1076(짝수, H.264) · 설명·브랜드 작은 글자 노토 산스 700.
-- 확장 ZIP version_name도 v1.31(핵심 원칙 10). 대상: ① AIMaster 운영(ref esgxyikcnnvmlhygjkth).
update public.programs
   set version = 'v1.31',
       extension_version = 'v1.31',
       extension_download_url = 'https://video-to-gif.buylife.xyz/downloads/local-renderer/gif-renderer-extension-latest.zip',
       updated_at = now()
 where slug = 'video-to-gif';

select slug, version, extension_version from public.programs where slug = 'video-to-gif';
