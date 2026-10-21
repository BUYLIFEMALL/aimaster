-- v1.16 (2026-10-21, 이커머스 병합 E1): AI 12단 상세페이지(detail-page-12p)의 마켓 규격을 이 앱으로 옮긴다.
-- 상세페이지 규격(layout_preset): shop15(기존 15섹션) / coupang12(쿠팡 로켓배송형 12단) / smartstore9(스마트스토어 감성 후기형 9단).
-- 장면 구성은 detail-page-12p src/lib/detailEngine.ts 의 [시퀀스 구성 가이드]를 그대로 옮겼고,
-- 프롬프트는 이 앱 템플릿 형식({{변수}}, lib/ai/promptTemplates.ts applyProductVariables)으로 다시 썼다.
-- 적용 대상: 운영 ① AIMaster, ref esgxyikcnnvmlhygjkth. 기존 행은 모두 shop15(기본값)로 유지된다.

alter table public.shop_prompt_templates
  add column if not exists layout_preset text not null default 'shop15'
  check (layout_preset in ('shop15', 'coupang12', 'smartstore9'));

alter table public.shop_products
  add column if not exists layout_preset text not null default 'shop15'
  check (layout_preset in ('shop15', 'coupang12', 'smartstore9'));

create index if not exists shop_prompt_templates_preset_idx on public.shop_prompt_templates(layout_preset, section_order);

-- 공통 한국어 지침(모든 장면): 짧고 정확한 한국어 카피, 근거 없는 인증·수치 금지.
insert into public.shop_prompt_templates
  (user_id, layout_preset, section_key, section_order, section_name, prompt_template, korean_guide, aspect_ratio, resolution, is_active)
values
-- ── 쿠팡 로켓배송형 12단 ──────────────────────────────────────────────
(null, 'coupang12', 'cp_promotion', 1, '프로모션 배너',
 'Create the top promotion banner of a Coupang-style mobile product detail page (860px wide layout) featuring the reference product photo. Emphasize a limited-time benefit with the sale price "{{sale_price}}" against the original price "{{original_price}}" and the product name "{{product_name}}". Bold, high-contrast commercial layout. Main color {{main_color}}, accent {{sub_color}}, background {{background}}. Mood: {{mood}}. Font style: {{font_style}}.',
 E'\n\n한국어 텍스트는 정확한 맞춤법으로 짧게(한 줄 12자 내외) 렌더링하라. 가격이 비어 있으면 가격 숫자를 지어내지 말고 「런칭 특가」 같은 일반 문구만 써라. 근거 없는 인증·수상·판매량 문구를 넣지 마라.',
 '3:4', '2K', true),
(null, 'coupang12', 'cp_hook', 2, '메인 후킹(공감)',
 'Create an empathy hook section that raises the customer''s everyday problem which "{{product_name}}" solves, for target customers: {{target_customer}}. Show a relatable lifestyle situation with the reference product subtly present. Background {{background}}, colors {{main_color}} / {{sub_color}}. Mood: {{mood}}.',
 E'\n\n공감형 질문 헤드카피 1줄(예: 「아직도 ○○ 때문에 고민이세요?」)과 짧은 보조 문장 1줄만 한국어로 렌더링하라.',
 '3:4', '2K', true),
(null, 'coupang12', 'cp_spec_summary', 3, '대표컷 & 핵심 스펙',
 'Create a hero shot section of the reference product with a clean summary panel of key specs: {{specs}}. Product name "{{product_name}}", category {{category}}. Studio lighting, background {{background}}, main color {{main_color}}. Layout density: {{layout_density}}.',
 E'\n\n스펙은 원문에 있는 값만 3~4개 짧게 표기하라. 원문에 없는 숫자·인증은 만들지 마라.',
 '3:4', '2K', true),
(null, 'coupang12', 'cp_feature1', 4, '특장점 01 (소재·성분)',
 'Create a feature section highlighting the material / ingredient / build advantage of the product: "{{feature_1}}". Close-up styled shot inspired by the reference product photo. Background {{background}}, colors {{main_color}} / {{sub_color}}. Mood: {{mood}}.',
 E'\n\n「POINT 01」 배지와 임팩트 있는 한국어 헤드카피 1줄, 보조 설명 1~2문장.',
 '3:4', '2K', true),
(null, 'coupang12', 'cp_feature2', 5, '특장점 02 (기능·편의)',
 'Create a feature section showing the function / performance / convenience benefit: "{{feature_2}}". Demonstrate the product in use, based on the reference product photo. Background {{background}}, colors {{main_color}} / {{sub_color}}. Mood: {{mood}}.',
 E'\n\n「POINT 02」 배지와 한국어 헤드카피 1줄, 보조 설명 1~2문장.',
 '3:4', '2K', true),
(null, 'coupang12', 'cp_feature3', 6, '특장점 03 (디자인·디테일)',
 'Create a feature section about design / feel / fit / detail: "{{feature_3}}". Elegant angle of the reference product. Background {{background}}, colors {{main_color}} / {{sub_color}}. Mood: {{mood}}. Font style: {{font_style}}.',
 E'\n\n「POINT 03」 배지와 한국어 헤드카피 1줄, 보조 설명 1~2문장.',
 '3:4', '2K', true),
(null, 'coupang12', 'cp_lifestyle', 7, '라이프스타일 컷',
 'Create a lifestyle scene where the reference product is naturally used in a real Korean everyday space for {{target_customer}}. Warm natural light, background {{background}}, color tone {{main_color}}. Mood: {{mood}}.',
 E'\n\n텍스트는 짧은 한국어 감성 문구 1줄만. 인물이 나오면 한국인으로 묘사하라.',
 '3:4', '2K', true),
(null, 'coupang12', 'cp_compare', 8, '비교 우위',
 'Create a comparison section: a generic ordinary product vs "{{product_name}}" side by side, with 3 comparison rows based on these features: {{key_features}}. Do not show any real competitor brand. Background {{background}}, highlight color {{main_color}}.',
 E'\n\n비교 항목은 한국어로 짧게(항목당 8자 내외). 「일반 제품」 대 「우리 제품」으로만 표기하고 실제 타사 브랜드명·근거 없는 수치는 쓰지 마라.',
 '3:4', '2K', true),
(null, 'coupang12', 'cp_macro', 9, '초근접 디테일',
 'Create an extreme close-up macro detail section of the reference product showing finish, texture and craftsmanship. Dramatic softbox lighting, background {{background}}, accent {{sub_color}}. Mood: {{mood}}.',
 E'\n\n텍스트는 한국어 헤드카피 1줄만(예: 「디테일이 다릅니다」).',
 '3:4', '2K', true),
(null, 'coupang12', 'cp_howto', 10, '실전 활용 팁',
 'Create a step-by-step how-to-use section (3 steps with numbered icons) for the product based on: {{how_to_use}}. Use the reference product photo in each step. Background {{background}}, colors {{main_color}} / {{sub_color}}.',
 E'\n\n단계별 한국어 설명은 각 15자 내외로 짧게. 원문 사용법에 없는 단계는 만들지 마라.',
 '3:4', '2K', true),
(null, 'coupang12', 'cp_recommend', 11, '추천 고객 체크리스트',
 'Create a "recommended for" checklist section with 4 check items based on target customers: {{target_customer}}. Friendly icons, the reference product small in the corner. Background {{background}}, check color {{main_color}}.',
 E'\n\n「이런 분께 추천해요」 제목과 체크 문장 4개를 한국어로 짧게 렌더링하라.',
 '3:4', '2K', true),
(null, 'coupang12', 'cp_package_faq', 12, '구성품 · 배송/FAQ 안심',
 'Create a closing section showing the package contents laid out neatly with the reference product, plus a small reassurance area for delivery and FAQ. Product name "{{product_name}}". Background {{background}}, colors {{main_color}} / {{sub_color}}.',
 E'\n\n구성품·배송 안내는 원문 정보가 없으면 일반 문구(「구성품을 꼭 확인해 주세요」 등)로만 쓰고 배송일·보증기간 숫자를 지어내지 마라.',
 '3:4', '2K', true),

-- ── 스마트스토어 감성 후기형 9단 ──────────────────────────────────────
(null, 'smartstore9', 'ss_hook_promo', 1, '메인 후킹 & 프로모션',
 'Create the opening banner of a Naver SmartStore-style emotional detail page with the reference product photo and product name "{{product_name}}", with a soft promotion line using the sale price "{{sale_price}}". Airy, emotional editorial layout. Background {{background}}, colors {{main_color}} / {{sub_color}}. Mood: {{mood}}. Font style: {{font_style}}.',
 E'\n\n감성적인 한국어 헤드카피 1줄과 짧은 프로모션 문구 1줄. 가격이 비어 있으면 숫자를 지어내지 마라.',
 '3:4', '2K', true),
(null, 'smartstore9', 'ss_brand_story', 2, '대표 비주얼 & 브랜드 스토리',
 'Create a hero visual of the reference product with a short brand story area about why "{{product_name}}" was made, for {{target_customer}}. Editorial magazine style, background {{background}}, color {{main_color}}. Mood: {{mood}}.',
 E'\n\n브랜드 스토리는 한국어 2~3문장. 근거 없는 수상·역사 연도는 쓰지 마라.',
 '3:4', '2K', true),
(null, 'smartstore9', 'ss_feature1', 3, '특장점 01 (핵심 소재·기능)',
 'Create a feature section for the core material / function: "{{feature_1}}", styled close-up inspired by the reference product photo. Background {{background}}, colors {{main_color}} / {{sub_color}}. Mood: {{mood}}.',
 E'\n\n한국어 헤드카피 1줄과 보조 설명 1~2문장.',
 '3:4', '2K', true),
(null, 'smartstore9', 'ss_feature2', 4, '특장점 02 (편의·디자인)',
 'Create a feature section for usability and design: "{{feature_2}}", showing the reference product in use. Background {{background}}, colors {{main_color}} / {{sub_color}}. Mood: {{mood}}.',
 E'\n\n한국어 헤드카피 1줄과 보조 설명 1~2문장.',
 '3:4', '2K', true),
(null, 'smartstore9', 'ss_lifestyle', 5, '라이프스타일 감성 연출',
 'Create an emotional lifestyle photo where the reference product sits in a cozy Korean home or daily scene for {{target_customer}}. Soft natural light, background {{background}}, tone {{main_color}}. Mood: {{mood}}.',
 E'\n\n텍스트는 감성 문구 1줄만. 인물이 나오면 한국인으로 묘사하라.',
 '3:4', '2K', true),
(null, 'smartstore9', 'ss_factcheck', 6, '비교 우위 팩트체크',
 'Create a fact-check style section listing 3 strengths of "{{product_name}}" compared with an ordinary product, based on: {{key_features}}. Clean infographic look, no real competitor brands. Background {{background}}, highlight {{main_color}}.',
 E'\n\n「일반 제품」 대 「우리 제품」으로만 비교하고, 원문에 없는 수치·실험 결과는 쓰지 마라.',
 '3:4', '2K', true),
(null, 'smartstore9', 'ss_detail', 7, '초근접 퀄리티 디테일',
 'Create a close-up quality detail section of the reference product showing texture and finish. Soft studio light, background {{background}}, accent {{sub_color}}. Mood: {{mood}}.',
 E'\n\n텍스트는 한국어 헤드카피 1줄만.',
 '3:4', '2K', true),
(null, 'smartstore9', 'ss_recommend', 8, '추천 고객 체크리스트',
 'Create a "recommended for you" checklist with 4 items based on target customers: {{target_customer}}, with the reference product shown small. Friendly rounded icons, background {{background}}, check color {{main_color}}.',
 E'\n\n제목 1줄과 체크 문장 4개를 한국어로 짧게.',
 '3:4', '2K', true),
(null, 'smartstore9', 'ss_package_faq', 9, '구성품 · 구매 안내/FAQ',
 'Create a closing section with the package contents of "{{product_name}}" and a short purchase guide / FAQ area. Neat flat-lay of the reference product. Background {{background}}, colors {{main_color}} / {{sub_color}}.',
 E'\n\n원문에 없는 배송일·보증·교환 조건 숫자는 지어내지 말고 일반 안내 문구로만 써라.',
 '3:4', '2K', true);

-- 되돌리기(문제 시): delete from public.shop_prompt_templates where layout_preset in ('coupang12','smartstore9') and user_id is null;
--   (열은 남겨도 기존 동작에 영향 없음)
