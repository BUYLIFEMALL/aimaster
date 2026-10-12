-- Metadata DML only. Keep catalog inactive until production checks pass.
BEGIN;
INSERT INTO public.programs (slug,name,category_id,short_desc,description,app_url,version,badges,is_active,sort_order,required_grade_id)
VALUES ('suno-music-studio','Suno 음악 기획 스튜디오',
(select id from public.categories where slug='multimedia'),
'개인 AI로 음악 스타일·가사·앨범을 설계하고 Suno 제작에 필요한 자료를 준비합니다.',
'장르·댄스 프리셋, 영문 Style 조합, 한·영 가사와 보컬·랩 비율, 곡별 작사, 3~12곡 앨범 흐름, 중지·미완성 곡 이어가기, 최종 확인, 회원별 보관함과 TXT·JSON 백업을 제공합니다. Gemini·OpenAI·Claude의 본인 API 키만 사용하며 음악 파일 생성은 본인 Suno 계정 또는 기존 음악 자동화 프로그램에서 별도로 진행합니다.',
'https://suno-music-studio.buylife.xyz','v1.01',ARRAY['new']::text[],false,0,(select id from public.member_grades where name='일반'))
ON CONFLICT (slug) DO NOTHING;
-- Correct only the unreleased staging entry. No implicit FREE entitlement.
UPDATE public.programs SET badges=ARRAY['new']::text[],required_grade_id=(select id from public.member_grades where name='일반'),updated_at=now()
WHERE slug='suno-music-studio' AND is_active=false;
INSERT INTO public.pricing_plans (program_id,name,billing_type,price,original_price,is_active,sort_order)
SELECT p.id,v.name,v.billing_type,v.price,v.price,true,v.sort_order
FROM public.programs p CROSS JOIN (VALUES
('1개월','monthly',10000,1),('2개월','bimonthly',20000,2),('3개월','quarterly',30000,3)
) AS v(name,billing_type,price,sort_order)
WHERE p.slug='suno-music-studio'
AND NOT EXISTS (SELECT 1 FROM public.pricing_plans pp WHERE pp.program_id=p.id AND pp.billing_type=v.billing_type);
COMMIT;
