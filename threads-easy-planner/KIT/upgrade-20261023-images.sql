-- Threads AI 기획 자동화 배포판 v1.02 (2026-10-23): 글과 함께 이미지 만들기
-- 배포판 v1.01 로 이미 설치한 분만 Supabase SQL Editor 에서 한 번 실행합니다(새로 설치하는 분은 schema.sql 에 들어 있어 필요 없음).
-- 여러 번 실행해도 안전합니다.
alter table public.tep_saved_plans add column if not exists image_urls jsonb not null default '[]'::jsonb;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tep-images', 'tep-images', true, 12582912, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;
