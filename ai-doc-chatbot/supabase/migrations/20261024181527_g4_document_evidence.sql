-- G-4, 운영 ref esgxyikcnnvmlhygjkth. 원문/임베딩/기존 RPC/생성일/정리 작업 보존.
alter table public.dcb_documents
  add column category text not null default '' check (char_length(category) <= 40),
  add column processing_status text not null default 'ready' check (processing_status in ('processing', 'ready')),
  add column extraction_warning text check (extraction_warning in ('possible_text_extraction_issue'));

-- 서비스 키로 조회해도 회원·문서·조각 수명을 함수 안에서 다시 제한한다.
-- 먼저 작은 본인 허용 집합을 만든 뒤 정확히 정렬해 ANN 전체 상위 결과 후처리를 피한다.
create function public.dcb_match_chunks_scoped(
  p_user_id uuid, p_embedding extensions.vector(1024), p_document_ids uuid[] default null, p_count int default 10
)
returns table (id uuid, document_id uuid, document_name text, content text, similarity float)
language sql stable security invoker
set search_path = public, extensions
as $$
  with scoped as materialized (
    select c.id, c.document_id, d.name, c.content, c.embedding
    from public.dcb_chunks c join public.dcb_documents d on d.id = c.document_id
    where c.user_id = p_user_id and d.user_id = p_user_id
      and d.processing_status = 'ready'
      and d.created_at > now() - interval '30 days'
      and c.created_at > now() - interval '30 days'
      and (p_document_ids is null or d.id = any(p_document_ids))
  )
  select s.id, s.document_id, s.name, s.content, 1 - (s.embedding <=> p_embedding)
  from scoped s order by s.embedding <=> p_embedding
  limit least(greatest(p_count, 1), 20);
$$;
revoke all on function public.dcb_match_chunks_scoped(uuid, extensions.vector, uuid[], int) from public, anon, authenticated;
grant execute on function public.dcb_match_chunks_scoped(uuid, extensions.vector, uuid[], int) to service_role;

-- Cron 실행 사이에도 만료/처리 중 문서의 직접 읽기를 막는다(서버 쓰기 권한은 유지).
alter policy dcb_documents_select_own on public.dcb_documents
  using ((select auth.uid()) = user_id and created_at > now() - interval '30 days' and processing_status = 'ready');
alter policy dcb_chunks_select_own on public.dcb_chunks
  using ((select auth.uid()) = user_id and created_at > now() - interval '30 days'
    and exists (select 1 from public.dcb_documents d where d.id = document_id and d.user_id = (select auth.uid())
      and d.created_at > now() - interval '30 days' and d.processing_status = 'ready'));
