-- 0066 쇼핑몰 사진 30일(안 쓰는 사진만) 시나리오(로컬 Docker 전용, 2026-11-14). 0064 시나리오 뒤(hq-mall, 사진 d3·zz 있음)
-- 기대: 40일 지난 안 쓰는 사진만 후보 · 쓰는 사진(상세 그림 d3)·로고·10일 된 사진은 아님 · 몰 주인이 관리자·시험 계정이면 0건
\set ON_ERROR_STOP 1
reset role;
insert into storage.objects (bucket_id, name, metadata, created_at) values
 ('mall-builder-public','00000000-0000-0000-0000-00000000005a/products/old-unused.jpg','{"size":100}', now() - interval '40 days'),
 ('mall-builder-public','00000000-0000-0000-0000-00000000005a/products/new-unused.jpg','{"size":100}', now() - interval '10 days'),
 ('mall-builder-public','00000000-0000-0000-0000-00000000005a/logo/logo.png','{"size":100}', now() - interval '40 days');
update mall_builder_stores set settings = coalesce(settings, '{}'::jsonb) || '{"app_logo":"https://x/storage/v1/object/public/mall-builder-public/00000000-0000-0000-0000-00000000005a/logo/logo.png"}' where id = '00000000-0000-0000-0000-00000000005a';
update storage.objects set created_at = now() - interval '40 days' where name like '00000000-0000-0000-0000-00000000005a/products/d3.jpg' or name like '00000000-0000-0000-0000-00000000005a/products/zz.jpg';
select '1 후보' t, name from mall_builder_expired_photos(100) order by name;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1', false);
select '2 사진 화면 로고' t, name, in_use, deletable from mall_builder_store_files('00000000-0000-0000-0000-00000000005a') where name like '%logo%';
reset role;
alter table public.profiles add column if not exists retention_exempt_manual boolean not null default false;
update public.profiles set retention_exempt_manual = true where id = '00000000-0000-0000-0000-0000000000a1';
select '3 관리자·시험 계정 몰' t, count(*) from mall_builder_expired_photos(100);
