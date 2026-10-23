-- v1.21: 내 PC 고속 변환 다듬기(새 버전 알림·최소 판, 맥 Homebrew 없을 때 안내, 윈도우 경고 설명, 엣지 안내) + 확장 버전 맞춤(LR-W-01). DB 구조 변경 없음.
-- 핵심 원칙 10: 확장 version_name(v1.21)과 프로그램 버전을 같게, 내려받기 주소는 그대로.
update public.programs
   set version = 'v1.21',
       extension_version = 'v1.21',
       extension_download_url = 'https://video-to-gif.buylife.xyz/downloads/local-renderer/gif-renderer-extension-latest.zip',
       updated_at = now()
 where slug = 'video-to-gif';
select slug, version, extension_version, extension_download_url from public.programs where slug = 'video-to-gif';
