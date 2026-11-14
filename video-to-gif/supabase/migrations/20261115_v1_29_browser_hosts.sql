-- v1.29(2026-11-15): 다운로드 센터 「선택」 표시·접기, 로컬 렌더러 연결 등록을 크롬·크로미움(ego lite)·엣지·웨일 4곳으로, 로그인 정책(로그아웃 local·기기 정보) 반영.
-- 확장 ZIP version_name도 v1.29(핵심 원칙 10). 대상: ① AIMaster 운영(ref esgxyikcnnvmlhygjkth).
update public.programs
   set version = 'v1.29',
       extension_version = 'v1.29',
       extension_download_url = 'https://video-to-gif.buylife.xyz/downloads/local-renderer/gif-renderer-extension-latest.zip',
       updated_at = now()
 where slug = 'video-to-gif';

select slug, version, extension_version from public.programs where slug = 'video-to-gif';
