-- AI 문서 챗봇 자동화(ai-doc-chatbot) v1.01 — 운영 DB(esgxyikcnnvmlhygjkth), 2026-10-19 주인님 승인
-- 표 이름표: dcb_ (doc chatbot). 회원 데이터는 모두 user_id + RLS(본인만 읽기), 쓰기는 서버(서비스 키)에서 user_id로 한정.
-- 생성 데이터(대화·문서·임베딩)는 생성일 기준 30일 뒤 자동 삭제(최상위 규칙).

create extension if not exists vector with schema extensions;

-- 채팅방
create table if not exists public.dcb_rooms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '새 대화',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists dcb_rooms_user_idx on public.dcb_rooms (user_id, updated_at desc);

-- 메시지(질문·답변·참고 출처)
create table if not exists public.dcb_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.dcb_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  sources jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists dcb_messages_room_idx on public.dcb_messages (room_id, created_at);

-- 올린 문서(원본 파일은 보관하지 않고, 뽑은 글은 조각으로 저장)
create table if not exists public.dcb_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  size_bytes int not null default 0,
  chunk_count int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists dcb_documents_user_idx on public.dcb_documents (user_id, created_at desc);

-- 문서 조각 + 임베딩(Upstage solar-embedding-2-passage, 1024차원)
create table if not exists public.dcb_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.dcb_documents(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  chunk_index int not null,
  content text not null,
  embedding extensions.vector(1024) not null,
  created_at timestamptz not null default now()
);
create index if not exists dcb_chunks_user_idx on public.dcb_chunks (user_id);
create index if not exists dcb_chunks_embedding_idx on public.dcb_chunks using hnsw (embedding extensions.vector_cosine_ops);

alter table public.dcb_rooms enable row level security;
alter table public.dcb_messages enable row level security;
alter table public.dcb_documents enable row level security;
alter table public.dcb_chunks enable row level security;

create policy dcb_rooms_select_own on public.dcb_rooms for select using (auth.uid() = user_id);
create policy dcb_messages_select_own on public.dcb_messages for select using (auth.uid() = user_id);
create policy dcb_documents_select_own on public.dcb_documents for select using (auth.uid() = user_id);
create policy dcb_chunks_select_own on public.dcb_chunks for select using (auth.uid() = user_id);

-- 본인 문서 조각 중 질문과 가까운 것 찾기(코사인 유사도). 서버(서비스 키)만 호출.
create or replace function public.dcb_match_chunks(p_user_id uuid, p_embedding extensions.vector(1024), p_count int default 5)
returns table (id uuid, document_id uuid, document_name text, content text, similarity float)
language sql stable
set search_path = public, extensions
as $$
  select c.id, c.document_id, d.name, c.content, 1 - (c.embedding <=> p_embedding) as similarity
  from public.dcb_chunks c
  join public.dcb_documents d on d.id = c.document_id
  where c.user_id = p_user_id
  order by c.embedding <=> p_embedding
  limit least(greatest(p_count, 1), 20);
$$;
revoke all on function public.dcb_match_chunks(uuid, extensions.vector, int) from public, anon, authenticated;
grant execute on function public.dcb_match_chunks(uuid, extensions.vector, int) to service_role;

-- 30일 자동 삭제(매일 03:30 KST = 18:30 UTC). 채팅방 삭제 시 메시지, 문서 삭제 시 조각이 함께 지워진다.
select cron.schedule(
  'dcb-retention-30d',
  '30 18 * * *',
  $$delete from public.dcb_rooms where created_at < now() - interval '30 days';
    delete from public.dcb_documents where created_at < now() - interval '30 days';$$
);
