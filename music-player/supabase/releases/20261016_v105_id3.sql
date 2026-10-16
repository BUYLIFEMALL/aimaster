-- Release metadata only. No schema, permissions, credentials or other programs change.
update public.programs
set version = 'v1.05', updated_at = now()
where slug = 'music-player' and version = 'v1.04'
returning slug, version;
