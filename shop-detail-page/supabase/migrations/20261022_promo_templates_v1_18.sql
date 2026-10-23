-- v1.18 (2026-10-22): 쿠팡 12단 #1·스마트스토어 9단 #1 시스템 템플릿이 근거 없는 혜택 문구를 만들지 않게 고친다(S-22-03).
-- 2026-10-22 실제 시험에서 할인가가 없는 상품의 쿠팡 12단 배너에 「런칭 특가」「한정 수량 특별 혜택」이 그려졌다.
-- 원인: 20261021_layout_presets_v1_16.sql 의 cp_promotion 이 "limited-time benefit"을 강조하라고 지시하고,
-- 가격이 비면 「런칭 특가」를 쓰라고 허용했다. ss_hook_promo 도 프로모션 문구 1줄을 항상 요구했다.
-- 코드(lib/actions/images.ts NO_PRICE_PROMOTION_GUIDE)에서도 할인가가 없으면 모든 템플릿에 금지 지침을 붙인다 — 이 파일은 템플릿 자체의 모순을 없앤다.
-- 적용 대상: 운영 ① AIMaster, ref esgxyikcnnvmlhygjkth. 시스템 행(user_id is null)만 바꾸고, 회원이 만든 템플릿은 건드리지 않는다.
-- 순서: 이 파일을 먼저 적용해도 v1.17 코드에 영향 없음(문구만 바뀜) → 그다음 v1.18 배포.

update public.shop_prompt_templates set
  prompt_template = 'Create the top banner of a Coupang-style mobile product detail page (860px wide layout) featuring the reference product photo and the product name "{{product_name}}". Price information — sale price: "{{sale_price}}", original price: "{{original_price}}". Only if a sale price is given, show it prominently (with the original price struck through when it is also given). Never invent or imply a discount, limited-time offer, limited quantity, launch sale, event or gift that is not in this information. Bold, high-contrast commercial layout. Main color {{main_color}}, accent {{sub_color}}, background {{background}}. Mood: {{mood}}. Font style: {{font_style}}.',
  korean_guide = E'\n\n한국어 텍스트는 정확한 맞춤법으로 짧게(한 줄 12자 내외) 렌더링하라. 헤드카피는 상품의 실제 장점에서 뽑아라. 할인가가 비어 있으면 가격·할인·특가·한정·이벤트·사은품 문구를 넣지 마라. 근거 없는 인증·수상·판매량 문구를 넣지 마라.'
where user_id is null and layout_preset = 'coupang12' and section_key = 'cp_promotion';

update public.shop_prompt_templates set
  prompt_template = 'Create the opening banner of a Naver SmartStore-style emotional detail page with the reference product photo and product name "{{product_name}}". Sale price: "{{sale_price}}" — only if it is given, add one soft price line; otherwise show no price or promotion at all. Airy, emotional editorial layout. Background {{background}}, colors {{main_color}} / {{sub_color}}. Mood: {{mood}}. Font style: {{font_style}}.',
  korean_guide = E'\n\n감성적인 한국어 헤드카피 1줄. 할인가가 있을 때만 짧은 가격 문구 1줄을 더하고, 비어 있으면 가격·할인·특가·한정·이벤트 문구를 넣지 마라.'
where user_id is null and layout_preset = 'smartstore9' and section_key = 'ss_hook_promo';

update public.programs set version = 'v1.18', updated_at = now() where slug = 'shop-detail-page';

-- 확인
select layout_preset, section_key, left(prompt_template, 60) from public.shop_prompt_templates
where user_id is null and section_key in ('cp_promotion', 'ss_hook_promo');
select slug, version from public.programs where slug = 'shop-detail-page';
