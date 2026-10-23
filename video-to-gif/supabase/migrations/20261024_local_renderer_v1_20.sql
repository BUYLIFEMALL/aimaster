-- v1.20: 「⚡ 내 PC 고속 변환」 — 크롬 확장 + PC 렌더러(ffmpeg) 연결, 사다리 단계 동시 실행. DB 구조 변경 없음.
-- 확장이 생겨 핵심 원칙 10(확장 운영 규칙)대로 확장 버전·내려받기 주소를 함께 기록한다.
update public.programs
   set version = 'v1.20',
       extension_version = 'v1.00',
       extension_download_url = 'https://video-to-gif.buylife.xyz/downloads/local-renderer/gif-renderer-extension-latest.zip',
       updated_at = now()
 where slug = 'video-to-gif';
select slug, version, extension_version, extension_download_url from public.programs where slug = 'video-to-gif';
