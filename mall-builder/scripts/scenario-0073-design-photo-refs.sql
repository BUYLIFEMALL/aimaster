-- 0073 디자인 표 로고·팝업 그림 = 쓰는 사진 시나리오(로컬 Docker 전용, 단독). 묶음에서 0073이 0080보다 먼저 적용됨(표가 나중에 생겨도 동작하는지)
-- 기대: 40일 지난 사진 4개 중 디자인 초안(헤더 로고)·게시본(팝업)에 쓰인 2개는 후보 아님, 안 쓰는 1개만 후보, 관리자 사진 화면도 같게
\set ON_ERROR_STOP 1
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a1','owner@x.test');
insert into public.profiles (id, email) values ('00000000-0000-0000-0000-0000000000a1','owner@x.test');
insert into mall_builder_stores (id, name, owner_id, slug, status) values ('00000000-0000-0000-0000-00000000005a','시험몰','00000000-0000-0000-0000-0000000000a1','scn','active');
insert into mall_builder_store_staff (store_id, user_id, role) values ('00000000-0000-0000-0000-00000000005a','00000000-0000-0000-0000-0000000000a1','owner');
\set p 'https://x/storage/v1/object/public/mall-builder-public/00000000-0000-0000-0000-00000000005a/banners/'
insert into storage.objects (bucket_id, name, metadata, created_at) values
 ('mall-builder-public','00000000-0000-0000-0000-00000000005a/banners/header-logo.png','{"size":100}', now() - interval '40 days'),
 ('mall-builder-public','00000000-0000-0000-0000-00000000005a/banners/popup.jpg','{"size":100}', now() - interval '40 days'),
 ('mall-builder-public','00000000-0000-0000-0000-00000000005a/banners/old-draft-only.jpg','{"size":100}', now() - interval '40 days'),
 ('mall-builder-public','00000000-0000-0000-0000-00000000005a/banners/unused.jpg','{"size":100}', now() - interval '40 days');
select '0 디자인 쓰기 전 후보 수' t, count(*) from mall_builder_expired_photos(100);
insert into mall_builder_design (store_id, kind, draft, published) values
 ('00000000-0000-0000-0000-00000000005a','header', jsonb_build_object('logo', :'p' || 'header-logo.png'), null),
 ('00000000-0000-0000-0000-00000000005a','popup', jsonb_build_object('image', :'p' || 'old-draft-only.jpg'), jsonb_build_object('image', :'p' || 'popup.jpg'));
select '1 후보' t, name from mall_builder_expired_photos(100) order by name;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000000a1', false);
select '2 사진 화면' t, name, in_use, deletable from mall_builder_store_files('00000000-0000-0000-0000-00000000005a') order by name;
