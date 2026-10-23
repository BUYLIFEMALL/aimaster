-- BLC-01: user-approved private photo bucket and server-only access boundary.
-- Target: AIMaster production esgxyikcnnvmlhygjkth. Existing buckets unchanged.
begin;

do $$
begin
  if exists (select 1 from storage.buckets where id = 'nba-private-photos') then
    raise exception 'nba-private-photos already exists; inspect it before applying';
  end if;
end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('nba-private-photos', 'nba-private-photos', false, 4194304,
        array['image/jpeg', 'image/png', 'image/webp']);

create policy nba_private_photos_server_only
on storage.objects
as restrictive
for all
to anon, authenticated
using (bucket_id <> 'nba-private-photos')
with check (bucket_id <> 'nba-private-photos');

commit;
