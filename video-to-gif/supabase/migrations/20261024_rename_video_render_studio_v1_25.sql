-- v1.25: 프로그램 명칭 및 아이덴티티 전면 개편 (이커머스 전용 탈피 ➔ 초고속 영상 렌더링 & GIF 스튜디오)
-- 표준 7대 컴포넌트 기반 연동 & 사용 매뉴얼(/guide) 리뉴얼 탑재
update public.programs
   set name = '초고속 영상 렌더링 & GIF 스튜디오',
       version = 'v1.25',
       extension_version = 'v1.25',
       extension_download_url = 'https://video-to-gif.buylife.xyz/downloads/local-renderer/gif-renderer-extension-latest.zip',
       updated_at = now()
 where slug = 'video-to-gif';

select slug, name, version, extension_version, extension_download_url from public.programs where slug = 'video-to-gif';
