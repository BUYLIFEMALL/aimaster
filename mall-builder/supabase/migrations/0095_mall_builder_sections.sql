-- 0095 디자인 빌더 E3 「내 섹션」 — 첫 화면 블록 묶음을 회원 본인 소유로 저장해 여러 몰 편집기에서 다시 넣는다(2026-11-15)
-- 주인님 결정(2026-11-15): Lab 먼저 적용 / 회원 본인 소유(직원인 모든 몰에서 보임) / 계속 보관(디자인 설정 성격, 자동 삭제 없음)
-- 플랜: docs/PLAN_20261115_MY_SECTIONS.md · 화면 쪽 검사: src/lib/builder/sections.ts(블록 검사는 서버 함수가 저장 전에 validateDoc으로 함)
-- 번호: 백엔드와 합의(상호 인수인계 S60 — 백엔드는 0096부터)

create table if not exists public.mall_builder_sections (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  blocks jsonb not null check (jsonb_typeof(blocks) = 'array'),
  source_store_id uuid references public.mall_builder_stores (id) on delete set null, -- 만든 몰(다른 몰에 넣을 때 상품 출처를 바꾸는 기준)
  created_at timestamptz not null default now()
);
create index if not exists mall_builder_sections_owner_idx on public.mall_builder_sections (owner_id, created_at desc);

alter table public.mall_builder_sections enable row level security;
-- 본인 것만 읽음. 쓰기·지우기는 아래 함수로만(직접 insert/update/delete 정책 없음)
create policy "mall_builder_sections_owner_read" on public.mall_builder_sections
  for select using (owner_id = auth.uid());

create or replace function public.mall_builder_section_save(p_store_id uuid, p_name text, p_blocks jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_name text := btrim(coalesce(p_name, ''));
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  if not public.mall_builder_is_store_staff(p_store_id) then raise exception '이 몰을 꾸밀 권한이 없습니다.'; end if;
  if char_length(v_name) < 1 or char_length(v_name) > 40 then raise exception '섹션 이름은 1~40자로 넣어 주세요.'; end if;
  if p_blocks is null or jsonb_typeof(p_blocks) <> 'array' or jsonb_array_length(p_blocks) < 1 or jsonb_array_length(p_blocks) > 10 then
    raise exception '섹션에는 블록을 1~10개 담을 수 있습니다.';
  end if;
  if octet_length(p_blocks::text) > 40000 then raise exception '섹션 내용이 너무 큽니다.'; end if; -- 화면 검사(20,000자)보다 넉넉히: 한글은 글자당 3바이트
  -- 같은 회원이 동시에 저장해도 30개를 넘지 않게 회원 단위로 줄 세움
  perform pg_advisory_xact_lock(hashtext('mall_builder_sections:' || auth.uid()::text));
  if (select count(*) from public.mall_builder_sections where owner_id = auth.uid()) >= 30 then
    raise exception '내 섹션은 30개까지 저장할 수 있습니다. 안 쓰는 섹션을 지운 뒤 저장해 주세요.';
  end if;
  insert into public.mall_builder_sections (owner_id, name, blocks, source_store_id)
  values (auth.uid(), v_name, p_blocks, p_store_id)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.mall_builder_section_delete(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다.'; end if;
  delete from public.mall_builder_sections where id = p_id and owner_id = auth.uid();
  if not found then raise exception '지울 섹션을 찾지 못했습니다.'; end if;
end;
$$;

revoke all on function public.mall_builder_section_save(uuid, text, jsonb) from public, anon;
revoke all on function public.mall_builder_section_delete(uuid) from public, anon;
grant execute on function public.mall_builder_section_save(uuid, text, jsonb) to authenticated;
grant execute on function public.mall_builder_section_delete(uuid) to authenticated;
