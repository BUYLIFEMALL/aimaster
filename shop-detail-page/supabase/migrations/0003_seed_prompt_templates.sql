-- 15개 섹션 시스템 기본 프롬프트 템플릿 시드 (user_id null = 전체 공개, 읽기전용 기본값).
-- n8n Airtable "프롬프트템플릿" 테이블의 실제 원문은 이 워크플로우 JSON 파일 안에는 없어서
-- (동적으로 조회만 하는 구조) 합리적인 초안으로 새로 작성했다. 사용자가 앱 안에서 자유롭게
-- 수정할 수 있으므로, 실제 운영하며 다듬어가면 된다. 변수 치환은 lib/ai/promptTemplates.ts의
-- applyProductVariables()가 담당하며, 여기 쓰인 {{변수명}}과 1:1로 대응해야 한다.

insert into public.shop_prompt_templates
  (user_id, section_key, section_order, section_name, prompt_template, korean_guide, aspect_ratio, resolution, is_active)
values
(null, 'header', 1, '헤더',
 'Create a premium e-commerce product detail page header banner featuring the reference product photo. Layout: large hero shot of the product on a {{background}} background, with the product name "{{product_name}}" as a bold headline and category "{{category}}" as a small subheading. Use {{main_color}} as the dominant color and {{sub_color}} as accent. Mood: {{mood}}. Typography style: {{font_style}}. Layout density: {{layout_density}}.',
 '\n\n한국어 텍스트는 정확한 맞춤법으로, 자연스러운 상업 광고 카피 톤으로 렌더링하라. 상품명과 카테고리 외의 텍스트는 추가하지 마라.',
 '4:5', '2K', true),

(null, 'key_features', 2, '핵심특징',
 'Create a product detail page section that summarizes key selling points as an icon+text grid, using the reference product photo as a small supporting visual. Content to visualize: {{key_features}}. Background: {{background}}. Main color {{main_color}}, sub color {{sub_color}}. Mood: {{mood}}. Font style: {{font_style}}.',
 '\n\n각 특징을 짧은 한국어 헤드카피(10자 내외)로 요약해서 표기하라. 원문 그대로 길게 쓰지 마라.',
 '4:5', '2K', true),

(null, 'feature1', 3, '특징 상세1',
 'Create a detailed feature highlight section for a single key benefit, using a close-up styled shot inspired by the reference product photo. Feature to highlight: "{{feature_1}}". Background: {{background}}. Colors: {{main_color}} / {{sub_color}}. Mood: {{mood}}.',
 '\n\n헤드카피는 한국어로 임팩트 있게, 보조 설명은 1~2문장으로 작성하라.',
 '4:5', '2K', true),

(null, 'feature2', 4, '특징 상세2',
 'Create a detailed feature highlight section for a single key benefit, using a close-up styled shot inspired by the reference product photo. Feature to highlight: "{{feature_2}}". Background: {{background}}. Colors: {{main_color}} / {{sub_color}}. Mood: {{mood}}.',
 '\n\n헤드카피는 한국어로 임팩트 있게, 보조 설명은 1~2문장으로 작성하라.',
 '4:5', '2K', true),

(null, 'feature3', 5, '특징 상세3',
 'Create a detailed feature highlight section for a single key benefit, using a close-up styled shot inspired by the reference product photo. Feature to highlight: "{{feature_3}}". Background: {{background}}. Colors: {{main_color}} / {{sub_color}}. Mood: {{mood}}.',
 '\n\n헤드카피는 한국어로 임팩트 있게, 보조 설명은 1~2문장으로 작성하라.',
 '4:5', '2K', true),

(null, 'specs', 6, '상세스펙',
 'Create a clean specification table section for an e-commerce product page, listing the following specs clearly: {{specs}}. Use a minimal grid/table layout. Background: {{background}}. Colors: {{main_color}} / {{sub_color}}. Font style: {{font_style}}.',
 '\n\n스펙 항목명과 값을 표 형태로 정확하게 한국어로 표기하라. 항목을 임의로 추가하지 마라.',
 '4:5', '2K', true),

(null, 'how_to_use', 7, '사용법',
 'Create a step-by-step "how to use" section with numbered steps, illustrated with styled product photography inspired by the reference image. Steps: {{how_to_use}}. Background: {{background}}. Colors: {{main_color}} / {{sub_color}}. Mood: {{mood}}.',
 '\n\n각 단계 번호와 설명을 한국어로 간결하게 표기하라.',
 '4:5', '2K', true),

(null, 'target', 8, '타겟고객',
 'Create a "who is this for" recommendation section listing target customer personas with simple icon or silhouette illustrations. Personas: {{target_customer}}. Background: {{background}}. Colors: {{main_color}} / {{sub_color}}. Mood: {{mood}}.',
 '\n\n"이런 분께 추천해요" 스타일의 한국어 카피로 각 페르소나를 짧게 표기하라.',
 '4:5', '2K', true),

(null, 'before_after', 9, '비포애프터',
 'Create a before/after comparison section relevant to this product''s core benefit, split into two clearly labeled halves ("BEFORE" and "AFTER"). Product context: {{key_features}}. Background: {{background}}. Colors: {{main_color}} / {{sub_color}}.',
 '\n\n좌우 또는 상하 비교 레이아웃으로 "전"과 "후" 라벨을 한국어로 표기하라.',
 '4:5', '2K', true),

(null, 'lifestyle', 10, '라이프스타일',
 'Create a lifestyle scene image showing the product naturally being used or displayed in a realistic everyday setting that matches the target customer: {{target_customer}}. Mood: {{mood}}. Background/setting: {{background}}. Colors: {{main_color}} / {{sub_color}}.',
 '\n\n텍스트 없이 순수 라이프스타일 사진 스타일로 생성하라.',
 '4:5', '2K', true),

(null, 'certification', 11, '인증',
 'Create a trust & certification badge section showing quality assurance visual elements (badges, checkmarks, seals) relevant to category {{category}}. Background: {{background}}. Colors: {{main_color}} / {{sub_color}}. Font style: {{font_style}}.',
 '\n\n"인증 및 신뢰" 헤더와 함께 신뢰를 주는 한국어 문구를 짧게 작성하라. 실존하지 않는 인증마크를 만들지 마라.',
 '4:5', '2K', true),

(null, 'faq', 12, 'FAQ',
 'Create a frequently asked questions (FAQ) section with a clean Q&A layout, 3 question-answer pairs relevant to this product category: {{category}}, features: {{key_features}}. Background: {{background}}. Colors: {{main_color}} / {{sub_color}}.',
 '\n\n질문과 답변을 자연스러운 한국어 존댓말로 작성하라.',
 '4:5', '2K', true),

(null, 'review', 13, '고객리뷰',
 'Create a customer review section with 2-3 styled review cards (star rating, short quote, reviewer label) relevant to this product. Background: {{background}}. Colors: {{main_color}} / {{sub_color}}. Mood: {{mood}}.',
 '\n\n리뷰 문구는 실제 있음 직한 자연스러운 한국어 후기 톤으로 작성하라. 과장된 허위 수치는 넣지 마라.',
 '4:5', '2K', true),

(null, 'shipping', 14, '배송/교환/반품',
 'Create a shipping/exchange/return policy info section with 3 simple icon+text blocks (배송안내, 교환, 반품). Background: {{background}}. Colors: {{main_color}} / {{sub_color}}. Font style: {{font_style}}.',
 '\n\n일반적인 이커머스 배송/교환/반품 안내 문구를 한국어로 간결하게 작성하라.',
 '4:5', '2K', true),

(null, 'cta', 15, 'CTA',
 'Create a final call-to-action section with a bold purchase button visual, showing the product photo, price "{{sale_price}}" (was "{{original_price}}"), and a strong closing headline. Background: {{background}}. Colors: {{main_color}} / {{sub_color}}. Mood: {{mood}}.',
 '\n\n"지금 구매하기" 스타일의 한국어 CTA 문구로 마무리하라.',
 '4:5', '2K', true);
