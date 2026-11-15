-- v1.30(2026-11-15): 「🛍 상품 사진 영상」(메이커 v0.3.3 후속 M2 — 사진 1~6장 → MP4·상세페이지 WebP, 여러 상품 일괄) + 대기분(확장 배지 Aside·왼쪽 메뉴 버전 글자).
-- 확장 ZIP version_name도 v1.30(핵심 원칙 10). 대상: ① AIMaster 운영(ref esgxyikcnnvmlhygjkth).
update public.programs
   set version = 'v1.30',
       extension_version = 'v1.30',
       extension_download_url = 'https://video-to-gif.buylife.xyz/downloads/local-renderer/gif-renderer-extension-latest.zip',
       updated_at = now()
 where slug = 'video-to-gif';

select slug, version, extension_version from public.programs where slug = 'video-to-gif';
