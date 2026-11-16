-- 2026-11-17 v1.89 배포(주인님 「쇼핑제휴 배포해」, Claud(ecommerce) claude-win-sdp). 운영 DB(ref esgxyikcnnvmlhygjkth)에 배포 Ready 뒤 적용함.
-- 같은 날 먼저 docs/handoff-tap189-prod/apply.sql(= 20261117100000_tap_collect_queue_atomic.sql 원문, 한 트랜잭션)을 적용·verify 8/8.
update public.programs
   set version = 'v1.89', extension_version = 'v1.89',
       extension_download_url = 'https://threads-affiliate-poster.buylife.xyz/downloads/threads-affiliate-poster-extension-latest.zip',
       updated_at = now()
 where slug = 'threads-affiliate-poster';
