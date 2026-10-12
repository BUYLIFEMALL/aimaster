-- 신규 프로그램 ebook-studio (eBook Studio) 등록
INSERT INTO public.programs (
  category_id,
  name,
  slug,
  short_desc,
  description,
  is_active,
  sort_order,
  required_grade_id,
  app_url,
  badges,
  version,
  thumbnail_url,
  updated_at
) VALUES (
  'd9fdfd64-8354-4a45-8b03-d5251831c0d8', -- 멀티미디어
  'eBook Studio',
  'ebook-studio',
  '문서와 메모를 AI로 정리하여 21종 테마 뷰어, 독립 HTML, Vercel 웹 배포, EPUB, PDF로 완성하는 올인원 전자책 스튜디오',
  '<h3>📖 문서 한 뭉치로 완성하는 나만의 고품질 웹/HTML 전자책</h3>
<p>강의록, 블로그 글, 회의록, 기획서 등 흩어진 텍스트를 입력하면 AI가 당해 연도(2026년) 기준 트렌드를 반영하여 10~15개 장(Chapter) 목차를 자동으로 설계하고 풍부한 본문을 집필합니다.</p>
<ul>
  <li><strong>4단계 올인원 워크플로우</strong>: 자료 수집 & 기획 ➔ 목차 & 챕터 집필 ➔ 21종 테마 & 5종 서체 스타일링 ➔ 웹 배포 & 내보내기</li>
  <li><strong>21종 독서 테마 & 5종 명품 서체</strong>: 따뜻한 종이, 빈티지 세피아, 미드나이트 등 21종 컬러 테마와 본고딕, 리디바탕, 마루부리 등 5종 서체 지원</li>
  <li><strong>원클릭 멀티 포맷 배포</strong>: 인터넷 없이 브라우저에서 바로 열리는 독립형 단일 HTML 파일, Vercel Drop용 웹 배포 ZIP, 표준 EPUB, 인쇄용 PDF 저장 완벽 지원</li>
  <li><strong>실시간 3-Column 작업대</strong>: 작업하면서 실제 완성될 모바일/태블릿/데스크톱 뷰어를 실시간으로 확인</li>
  <li><strong>본인 Gemini API 키 안전 보관</strong>: 사용자의 Google Gemini API 키로 직접 호출되며 파일 내에 키가 일절 포함되지 않아 안전합니다.</li>
</ul>',
  true,
  120,
  '861b7a37-d056-4404-80f5-85edb2e2ebff', -- 일반 등급
  'https://ebook-studio.buylife.xyz',
  '["new", "free"]'::jsonb,
  'v1.01',
  'https://esgxyikcnnvmlhygjkth.supabase.co/storage/v1/object/public/program-images/catalog/ebook-studio-thumbnail.jpg',
  NOW()
) ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  short_desc = EXCLUDED.short_desc,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  required_grade_id = EXCLUDED.required_grade_id,
  app_url = EXCLUDED.app_url,
  badges = EXCLUDED.badges,
  version = EXCLUDED.version,
  thumbnail_url = EXCLUDED.thumbnail_url,
  updated_at = NOW();

-- 요금제 3종 등록
DO $$
DECLARE
  p_id uuid;
BEGIN
  SELECT id INTO p_id FROM public.programs WHERE slug = 'ebook-studio';
  IF p_id IS NOT NULL THEN
    INSERT INTO public.pricing_plans (program_id, name, billing_type, price, original_price, is_active, sort_order)
    VALUES
      (p_id, '1개월', 'monthly', 10000, 10000, true, 0),
      (p_id, '2개월', 'bimonthly', 20000, 20000, true, 1),
      (p_id, '3개월', 'quarterly', 30000, 30000, true, 2)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
