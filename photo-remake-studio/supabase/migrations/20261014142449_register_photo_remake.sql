-- Existing-table DML only; no schema changes. Apply after environment approval and deployment readiness.
BEGIN;
INSERT INTO public.programs (slug,name,category_id,short_desc,description,app_url,version,badges,required_grade_id,is_active,sort_order,thumbnail_url)
SELECT 'photo-remake-studio','AI 포토 리메이크 자동화',category_id,
 '오래된 사진을 복원·컬러화하고 여러 사물을 자연스럽게 합성하는 AI 포토 리메이크 스튜디오',
 '<h2>AI 포토 리메이크 자동화</h2><p>회원 본인 Gemini API로 사진을 복원하거나 여러 사물을 자연스럽게 합성합니다.</p><h3>사진 복원</h3><ul><li>긁힘·찢어짐·빛바램 개선과 흑백 컬러화</li><li>AI 결과 기준 실제 2배·4배 확대, 긴 변 최대 8192px</li><li>얼굴·나이·구도 보존 지시와 추가 요청</li></ul><h3>사물 합성</h3><ul><li>기본 사진과 사물 최대 5장, 사물별 착용·사용 지시</li><li>AI 합성 지시 제안, 배경 유지·변경 선택</li><li>모든 사물 포함·원형 보존·자연스러운 조명 지시</li></ul><h3>비교와 저장</h3><ul><li>원본·결과 비교 슬라이더와 실제 픽셀 크기</li><li>JPEG·PNG 다운로드와 회원별 브라우저 보관함 최근 20개</li><li>원본 사진 서버 보관 없음, 본인 또는 동의받은 사진만 사용</li></ul><p>생성·합성 제안·연결 확인에는 본인 API 사용량이 발생합니다. AI 결과의 얼굴·색상·상품 형태는 직접 확인해야 합니다. 브라우저 보관함은 다른 기기와 공유되지 않습니다.</p>',
 'https://photo-remake-studio.buylife.xyz','v1.01',ARRAY['new'],required_grade_id,false,
 (SELECT COALESCE(MAX(sort_order),0)+1 FROM public.programs),'https://photo-remake-studio.buylife.xyz/catalog-thumbnail.jpg'
FROM public.programs WHERE slug='banana-canvas'
ON CONFLICT (slug) DO NOTHING;
INSERT INTO public.pricing_plans (program_id,name,billing_type,price,original_price,is_active,sort_order)
SELECT p.id,x.name,x.billing_type,x.price,x.price,true,x.sort_order
FROM public.programs p CROSS JOIN (VALUES ('1개월','monthly',10000,0),('2개월','bimonthly',20000,1),('3개월','quarterly',30000,2)) AS x(name,billing_type,price,sort_order)
WHERE p.slug='photo-remake-studio' AND NOT EXISTS (SELECT 1 FROM public.pricing_plans pp WHERE pp.program_id=p.id);
INSERT INTO public.grade_program_access (grade_id,program_id,can_access)
SELECT g.id,p.id,true FROM public.member_grades g CROSS JOIN public.programs p
WHERE g.name LIKE 'VIP%' AND p.slug='photo-remake-studio'
ON CONFLICT (grade_id,program_id) DO NOTHING;
COMMIT;
-- Activate only after production checks:
-- UPDATE public.programs SET is_active=true,updated_at=now() WHERE slug='photo-remake-studio';
-- 2026-10-15 실제 적용(supabase-js로 위와 같은 내용): programs·pricing_plans 3종·VIP grade_program_access 등록 후
-- 썸네일은 scripts/generate-program-thumbnail.mjs로 Storage에 올린 주소로 갱신, 배포 확인 뒤 활성화:
-- UPDATE public.programs SET thumbnail_url='https://esgxyikcnnvmlhygjkth.supabase.co/storage/v1/object/public/program-images/catalog/photo-remake-studio-thumbnail.jpg?v=1791997011974' WHERE slug='photo-remake-studio';
-- UPDATE public.programs SET is_active=true,updated_at=now() WHERE slug='photo-remake-studio';
