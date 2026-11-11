-- AI 쇼핑몰 빌더 D35 보완 — 공급사 사진 저장소 규칙의 이름 해석 실수 바로잡기(2026-11-11 Lab 실제 확인)
-- 원인: 규칙 안 하위 조회(mall_builder_suppliers x)에서 storage.foldername(name)의 name이 파일 이름(objects.name)이 아니라
--       공급사 표의 이름 칸(x.name)으로 해석됐다(같은 이름 칸이 있어 생긴 실수) → 진짜 공급사는 사진을 못 올림.
-- 해결: objects.name으로 명확히. alter policy만(지우기 없음). AIMaster_dev에만.
alter policy mall_builder_public_supplier_insert on storage.objects
  with check (bucket_id = 'mall-builder-public' and (storage.foldername(objects.name))[2] = 'supplier'
    and exists (select 1 from public.mall_builder_suppliers x
                 where x.id::text = (storage.foldername(objects.name))[3] and x.store_id::text = (storage.foldername(objects.name))[1]
                   and x.user_id = (select auth.uid()) and x.status = 'active'));
alter policy mall_builder_public_supplier_select on storage.objects
  using (bucket_id = 'mall-builder-public' and (storage.foldername(objects.name))[2] = 'supplier'
    and exists (select 1 from public.mall_builder_suppliers x
                 where x.id::text = (storage.foldername(objects.name))[3] and x.store_id::text = (storage.foldername(objects.name))[1]
                   and x.user_id = (select auth.uid())));
