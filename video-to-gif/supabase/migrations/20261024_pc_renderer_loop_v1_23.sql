-- v1.23: 내 PC 고속 변환 실행기 1.20 — 영상 명령 「loop」 추가(무한 루프 영상 v1.08이 사용, 영상 담당 claude-win-video). GIF·audio 약속은 그대로라 최소 판(minHost 1.00·minExtension v1.00) 그대로. DB 구조 변경 없음.
-- 핵심 원칙 10: 확장 version_name(v1.23)과 프로그램 버전을 같게, 내려받기 주소는 그대로.
update public.programs
   set version = 'v1.23',
       extension_version = 'v1.23',
       extension_download_url = 'https://video-to-gif.buylife.xyz/downloads/local-renderer/gif-renderer-extension-latest.zip',
       updated_at = now()
 where slug = 'video-to-gif';
select slug, version, extension_version, extension_download_url from public.programs where slug = 'video-to-gif';
