-- AI 쇼핑몰 빌더 D35 보완 — 공급사 사진 올리기 실패(2026-11-11 Lab 실제 확인, 진짜 공급사 계정)
-- 증상: 「new row violates row-level security policy」. 원인: 저장소는 파일을 넣은 직후 그 줄을 다시 읽어 돌려주므로 읽기 규칙도 필요한데,
--       0054는 넣기 규칙만 만들었다(로컬 시험은 대표 계정이 운영자 읽기 규칙으로 통과해 드러나지 않음).
-- 해결: 공급사 본인 폴더(<몰 id>/supplier/<공급사 id>/) 읽기 규칙 추가. AIMaster_dev에만, 추가만.
create policy mall_builder_public_supplier_select on storage.objects for select
  using (bucket_id = 'mall-builder-public' and (storage.foldername(name))[2] = 'supplier'
    and exists (select 1 from public.mall_builder_suppliers x
                 where x.id::text = (storage.foldername(name))[3] and x.store_id::text = (storage.foldername(name))[1]
                   and x.user_id = (select auth.uid())));
