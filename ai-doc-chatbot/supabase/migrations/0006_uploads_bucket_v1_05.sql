-- 2026-10-19 v1.05: 4MB 넘는 문서(L2)를 화면이 직접 올리는 비공개 버킷. 서버가 읽은 직후 삭제(원본 보관 안 함).
-- 운영 DB esgxyikcnnvmlhygjkth 에 Storage API(POST /storage/v1/bucket, 서버 키)로 만들었다 — 아래는 같은 내용의 SQL 기록.
-- 공개 접근 정책(RLS policy)은 만들지 않는다: 업로드는 서버가 발급한 1회용 서명 주소로만, 읽기·삭제는 서버 키로만.
insert into storage.buckets (id, name, public, file_size_limit)
values ('dcb-uploads', 'dcb-uploads', false, 52428800)
on conflict (id) do nothing;

update programs set version = 'v1.05', updated_at = now() where slug = 'ai-doc-chatbot';
