-- v1.26(2026-11-06): V4 「화면에서 바로 녹화」 + V5 「내 영상 일부 지우기」 배포. 확장·ZIP도 같은 버전(핵심 원칙 10).
-- 대상: ① AIMaster 운영(ref esgxyikcnnvmlhygjkth).
update public.programs
   set version = 'v1.26',
       extension_version = 'v1.26',
       extension_download_url = 'https://video-to-gif.buylife.xyz/downloads/local-renderer/gif-renderer-extension-latest.zip',
       updated_at = now()
 where slug = 'video-to-gif';

select slug, version, extension_version from public.programs where slug = 'video-to-gif';
