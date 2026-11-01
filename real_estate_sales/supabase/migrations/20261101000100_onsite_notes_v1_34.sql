-- real-estate-sales v1.34: 임장 노트 (운영 DB esgxyikcnnvmlhygjkth)
-- 좌표가 원본이고 주소는 나중에 채운다. 회원 본인 전용, 보관 1년(cleanup-sentiment 예약 작업).
create table if not exists public.real_estate_onsite_properties (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lat double precision not null,
  lon double precision not null,
  accuracy_m integer,
  coord_source text not null check (coord_source in ('capture', 'exif', 'manual')),
  coord_confirmed boolean not null default false,
  sgg_cd text,
  admin_dong text,
  address text,
  address_source text check (address_source in ('auto', 'member')),
  kind text,
  status text not null default 'new' check (status in ('new', 'interested', 'contact', 'excluded')),
  rating smallint check (rating between 1 and 5),
  floor text,
  unit text,
  memo text,
  visited_on date not null default ((now() at time zone 'Asia/Seoul')::date),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_onsite_properties_user on public.real_estate_onsite_properties (user_id, visited_on desc);
create index if not exists idx_onsite_properties_created on public.real_estate_onsite_properties (created_at);

create table if not exists public.real_estate_onsite_photos (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.real_estate_onsite_properties(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null unique,
  lat double precision,
  lon double precision,
  accuracy_m integer,
  coord_source text check (coord_source in ('capture', 'exif', 'manual')),
  width integer,
  height integer,
  bytes integer,
  created_at timestamptz not null default now()
);
create index if not exists idx_onsite_photos_property on public.real_estate_onsite_photos (property_id, created_at);

alter table public.real_estate_onsite_properties enable row level security;
alter table public.real_estate_onsite_photos enable row level security;

drop policy if exists onsite_properties_owner on public.real_estate_onsite_properties;
create policy onsite_properties_owner on public.real_estate_onsite_properties
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists onsite_photos_owner on public.real_estate_onsite_photos;
create policy onsite_photos_owner on public.real_estate_onsite_photos
  for all to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.real_estate_onsite_properties p where p.id = property_id and p.user_id = auth.uid())
  );

-- 비공개 버킷: 정책을 두지 않아 브라우저 직접 접근은 막히고, 서버가 권한 확인 뒤 서명 주소로만 올리고 보여 준다.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('real-estate-onsite', 'real-estate-onsite', false, 5242880, array['image/jpeg'])
on conflict (id) do nothing;

update public.programs set version = 'v1.34', updated_at = now() where slug = 'real-estate-sales' returning slug, version;
