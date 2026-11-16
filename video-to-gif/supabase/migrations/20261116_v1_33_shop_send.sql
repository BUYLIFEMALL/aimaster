-- v1.33(2026-11-16): 상세페이지로 보내기 GIF/WebP 종류대로·10MB 사전 차단(MOV-20261116-01), 한 번 호출당 자동 전송 1회(MOV-20261116-02).
-- 확장 ZIP version_name도 v1.33(핵심 원칙 10). 대상: ① AIMaster 운영(ref esgxyikcnnvmlhygjkth).
update public.programs
   set version = 'v1.33',
       extension_version = 'v1.33',
       extension_download_url = 'https://video-to-gif.buylife.xyz/downloads/local-renderer/gif-renderer-extension-latest.zip',
       updated_at = now()
 where slug = 'video-to-gif';

select slug, version, extension_version from public.programs where slug = 'video-to-gif';
