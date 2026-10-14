-- AI 엑셀·텍스트 합치기 자동화 (slug: file-merge) — 프로그램 등록 + 요금제 3종 + VIP 등급 접근 (v1.01, 2026-10-15)
-- 카테고리 Tools, 최소 등급은 다른 프로그램과 같은 '일반'. 배지 new(FREE 아님 — 무료로 풀 때는 관리자 화면에서 FREE 배지만 켠다).
-- 회원 데이터 테이블·API 키 없음(파일은 브라우저 안에서만 처리). 2026-10-15 service role 스크립트로 같은 내용을 적용했다.
INSERT INTO public.programs (slug, name, short_desc, description, app_url, version, is_active, badges, category_id, required_grade_id)
SELECT 'file-merge', 'AI 엑셀·텍스트 합치기 자동화',
  '엑셀·CSV·텍스트 파일을 머리글 기준으로 합치고, 시트·열 값·행 수·글자 수 기준으로 나누는 도구. 파일은 내 브라우저 안에서만 처리됩니다.',
  '여러 엑셀(.xlsx·.xls·.xlsm)·CSV 파일을 머리글 이름 기준으로 한 표에 이어 붙입니다. 파일마다 열 순서가 달라도, 한쪽에만 있는 열이 있어도 같은 열에 맞춰 들어가고 머리글은 한 번만 들어가며, 원본 파일·시트 열을 함께 넣을 수 있습니다. 파일 순서 변경, 합칠 시트 선택, 머리글 행 지정, 시트별로 한 파일에 모으기, 엑셀·CSV 저장을 지원합니다. 엑셀 나누기는 시트별, 특정 열 값별(예: 지역별), N행씩 나눠 ZIP으로 저장하고 파일마다 머리글을 다시 넣습니다. 텍스트는 여러 파일을 순서·구분자·파일명 머리말을 정해 합치고, 긴 글을 글자 수·조각 수·문장 수 기준으로 문단과 문장 경계를 지키며 나눕니다. 메모장 ANSI(한글)·UTF-8 인코딩을 자동으로 알아봅니다. 처리 전 결과를 미리보기로 확인할 수 있고, 파일은 서버로 전송·저장되지 않으며 API 키도 필요 없습니다.',
  'https://file-merge.buylife.xyz', 'v1.01', true, ARRAY['new'],
  (SELECT id FROM public.categories WHERE name = 'Tools' LIMIT 1),
  (SELECT required_grade_id FROM public.programs WHERE slug = 'document-translator')
WHERE NOT EXISTS (SELECT 1 FROM public.programs WHERE slug = 'file-merge');

INSERT INTO public.pricing_plans (program_id, name, billing_type, price, original_price, is_active, sort_order)
SELECT p.id, v.name, v.bt, v.price, v.price, true, v.so
FROM public.programs p
CROSS JOIN (VALUES ('1개월','monthly',10000,1), ('2개월','bimonthly',20000,2), ('3개월','quarterly',30000,3)) AS v(name, bt, price, so)
WHERE p.slug = 'file-merge' AND NOT EXISTS (SELECT 1 FROM public.pricing_plans pp WHERE pp.program_id = p.id);

INSERT INTO public.grade_program_access (grade_id, program_id)
SELECT g.id, p.id FROM public.member_grades g, public.programs p
WHERE g.name LIKE 'VIP%' AND p.slug = 'file-merge'
  AND NOT EXISTS (SELECT 1 FROM public.grade_program_access a WHERE a.grade_id = g.id AND a.program_id = p.id);
