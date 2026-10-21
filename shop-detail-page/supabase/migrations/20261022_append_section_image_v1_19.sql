-- v1.19 (2026-10-22): 섹션 이미지 이력 원자적 추가(D-48-01 남은 부분).
-- 기존 코드는 image_urls를 읽은 뒤 새 URL을 붙여 upsert했다. 같은 섹션을 두 창·두 탭에서 동시에 만들면
-- 나중에 끝난 쪽이 먼저 끝난 쪽의 이력을 덮어써, 비용을 낸 이미지 한 장이 이력에서 사라질 수 있었다.
-- 이 함수는 insert … on conflict do update 한 문장으로 기존 배열 뒤에 붙인다.
-- security invoker: 호출한 회원 권한으로 실행되어 기존 RLS(본인 행만)가 그대로 적용된다. user_id는 auth.uid()로 고정.
-- 적용 대상: 운영 ① AIMaster, ref esgxyikcnnvmlhygjkth. 순서: 이 파일 먼저 → v1.19 배포.
-- (코드는 함수가 없을 때 예전 방식으로 동작하므로 순서가 바뀌어도 생성이 멈추지는 않는다.)

create or replace function public.shop_append_section_image(
  p_product_id uuid,
  p_template_id uuid,
  p_section_key text,
  p_section_order int,
  p_language text,
  p_image_url text,
  p_prompt_used text default null
) returns void
language sql
security invoker
set search_path = public
as $$
  insert into public.shop_product_images
    (product_id, user_id, template_id, section_key, section_order, language, prompt_used, image_url, image_urls)
  values
    (p_product_id, auth.uid(), p_template_id, p_section_key, p_section_order, p_language, p_prompt_used, p_image_url, array[p_image_url])
  on conflict (product_id, section_key, language) do update set
    template_id = excluded.template_id,
    section_order = excluded.section_order,
    prompt_used = coalesce(excluded.prompt_used, shop_product_images.prompt_used),
    image_url = excluded.image_url,
    image_urls = shop_product_images.image_urls || excluded.image_urls,
    updated_at = now();
$$;

revoke all on function public.shop_append_section_image(uuid, uuid, text, int, text, text, text) from public, anon;
grant execute on function public.shop_append_section_image(uuid, uuid, text, int, text, text, text) to authenticated;

update public.programs set version = 'v1.19', updated_at = now() where slug = 'shop-detail-page';

-- 확인
select proname, prosecdef from pg_proc where proname = 'shop_append_section_image';
select slug, version from public.programs where slug = 'shop-detail-page';
