-- Threads AI 기획 자동화 v1.48 (2026-10-23): 글과 함께 이미지 생성 — 보관함 이미지 칸 + 이미지 저장 버킷
-- 운영 DB(AIMaster ref esgxyikcnnvmlhygjkth) 적용. 배포판은 KIT/schema.sql·KIT/upgrade-20261023-images.sql 에 같은 내용.
alter table public.tep_saved_plans add column if not exists image_urls jsonb not null default '[]'::jsonb;

-- 공개 읽기 버킷(올리기는 서버 서비스 키만, 경로 「<회원 id>/<파일>」, 30일 지나면 보관함 목록을 열 때 회원별 삭제)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tep-images', 'tep-images', true, 12582912, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

UPDATE public.programs
SET version = 'v1.48', updated_at = NOW()
WHERE slug = 'threads-easy-planner';
