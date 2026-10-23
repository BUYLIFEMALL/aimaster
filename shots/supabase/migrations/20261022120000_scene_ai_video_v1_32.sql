-- v1.32 (2026-10-22): 장면 AI 영상(회원 본인 Gemini·Replicate·fal 키, 공용 기준 코드 ai-video-*). 표 구조 변경 없음 —
-- 장면 영상은 기존 공개 버킷 shots-videos의 <회원>/<영상>-scenes/<장면 id>.mp4(30일 정리 작업이 함께 지움). 운영 user_api_keys 허용 목록의
-- fal·elevenlabs는 2026-10-22 원스톱 v1.26 작업에서 추가됨(shorts-onestop-studio/supabase/migrations/0030_v1_26_elevenlabs_voice.sql).
update public.programs set version='v1.32', updated_at=now() where slug='auto-shorts-posting';
