-- v1.24: 내 PC 고속 변환 실행기 1.30 — 영상 명령 「normalize」(넣는 영상 규격 맞추기)·「compress」(완성 MP4 용량 줄이기) 추가(AI 영상 스튜디오 v1.17 영상 합치기가 사용, 영상 담당 claude-win-video). GIF·audio·loop 약속은 그대로라 최소 판(minHost 1.00·minExtension v1.00) 그대로. DB 구조 변경 없음.
-- 핵심 원칙 10: 확장 version_name(v1.24)과 프로그램 버전을 같게, 내려받기 주소는 그대로.
update public.programs
   set version = 'v1.24',
       extension_version = 'v1.24',
       extension_download_url = 'https://video-to-gif.buylife.xyz/downloads/local-renderer/gif-renderer-extension-latest.zip',
       updated_at = now()
 where slug = 'video-to-gif';
select slug, version, extension_version, extension_download_url from public.programs where slug = 'video-to-gif';
