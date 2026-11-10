-- 2026-11-11 V6 내 채널 진짜 지표(v1.27, 주인님 승인): 공용 연동 목록 youtube 항목에 분석 권한 묶음 추가(기존 manage 유지). 운영 DB esgxyikcnnvmlhygjkth.
update public.integration_catalog
   set scope_sets = scope_sets || jsonb_build_object('analytics', jsonb_build_array('https://www.googleapis.com/auth/yt-analytics.readonly', 'https://www.googleapis.com/auth/youtube.readonly')),
       updated_at = now()
 where key = 'youtube';
