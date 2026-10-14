-- AI 글쓰기 에디터 자동화 (slug: ai-writing-editor) — v1.04 확장: 본문 저장 형식 + 문서 이미지 버킷 (2026-10-14)
-- content_type: 기존 문서는 'markdown', 서식 확장(표·이미지·글자 색·정렬)을 저장하려고 새로 저장하는 문서는 'html'.
-- 이미지 버킷: 공개(public) 버킷, 파일명은 <uid>/<uuid>.<ext>(추측 불가능). 업로드·삭제는 서버(service role)만 하며 정책을 만들지 않는다.
-- 주의: Supabase MCP execute_sql은 여러 문장을 한 번에 보내면 거부될 수 있어 문장별로 적용했다.

alter table public.ai_writing_editor_documents
  add column if not exists content_type text not null default 'markdown'
  check (content_type in ('markdown','html'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ai-writing-editor-images', 'ai-writing-editor-images', true, 4194304, array['image/png','image/jpeg','image/webp','image/gif'])
on conflict (id) do update set public = true, file_size_limit = 4194304, allowed_mime_types = array['image/png','image/jpeg','image/webp','image/gif'];
